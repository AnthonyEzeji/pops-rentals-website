import "server-only";
import type { ReservationStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { config } from "./config";
import {
  BookingError,
  assertValidRange,
  findConflict,
  isOverlapViolation,
  quoteChauffeur,
  quoteSelfDrive,
} from "./availability";
import { bookingReference } from "./reference";
import {
  sendAdminAlert,
  sendCancellationNotice,
  sendChauffeurConfirmed,
  sendCustomerConfirmation,
  type ReservationEmailData,
} from "./email";

export function vehicleLabel(v: { year: number; make: string; model: string }) {
  return `${v.year} ${v.make} ${v.model}`;
}

/** One customer record per email address; later bookings refresh the details. */
async function upsertCustomer(
  db: Parameters<typeof findConflict>[0],
  input: {
    name: string;
    email: string;
    phone: string;
    licenseNumber?: string;
    licenseExpiry?: Date;
    licenseCountry?: string;
  },
) {
  const email = input.email.toLowerCase().trim();
  const existing = await db.customer.findFirst({ where: { email } });
  const data = {
    name: input.name,
    phone: input.phone,
    licenseNumber: input.licenseNumber ?? undefined,
    licenseExpiry: input.licenseExpiry ?? undefined,
    licenseCountry: input.licenseCountry ?? undefined,
  };
  if (existing) {
    return db.customer.update({ where: { id: existing.id }, data });
  }
  return db.customer.create({ data: { email, ...data } });
}

async function emailPayload(reservationId: string): Promise<ReservationEmailData> {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { vehicle: true, customer: true, chauffeurTrip: { include: { driver: true } } },
  });
  return {
    reference: reservation.reference,
    type: reservation.type,
    customerName: reservation.customer.name,
    customerEmail: reservation.customer.email,
    vehicleLabel: vehicleLabel(reservation.vehicle),
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    priceTotal: reservation.priceTotal,
    amountPaid: reservation.amountPaid,
    securityDeposit: reservation.type === "chauffeur" ? 0 : reservation.securityDeposit,
    currency: reservation.currency,
    pickupAddress: reservation.chauffeurTrip?.pickupAddress,
    dropoffAddress: reservation.chauffeurTrip?.dropoffAddress,
    driverName: reservation.chauffeurTrip?.driver?.name ?? null,
  };
}

export type SelfDriveInput = {
  vehicleId: string;
  startAt: Date;
  endAt: Date;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: Date;
  licenseCountry: string;
  notes?: string;
};

export async function createSelfDriveReservation(input: SelfDriveInput) {
  assertValidRange(input.startAt, input.endAt, "self_drive");

  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new BookingError("not_found", "That vehicle is no longer available.");

  const quote = quoteSelfDrive(vehicle, input.startAt, input.endAt);

  try {
    // The conflict check and the insert share one transaction, so two customers
    // racing for the same dates cannot both pass the check.
    const reservation = await prisma.$transaction(async (tx) => {
      const conflict = await findConflict(tx, input.vehicleId, input.startAt, input.endAt);
      if (conflict) throw new BookingError("unavailable", conflict.detail);

      const customer = await upsertCustomer(tx, input);

      return tx.reservation.create({
        data: {
          reference: bookingReference(),
          type: "self_drive",
          status: "pending",
          holdsAvailability: true,
          vehicleId: vehicle.id,
          customerId: customer.id,
          startAt: input.startAt,
          endAt: input.endAt,
          priceTotal: quote.total,
          depositAmount: quote.deposit,
          securityDeposit: quote.securityDeposit,
          currency: quote.currency,
          paymentStatus: "unpaid",
          notes: input.notes ?? "",
          statusEvents: {
            create: { toStatus: "pending", actor: "customer", note: "Booking created" },
          },
        },
      });
    });

    return { reservation, quote };
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new BookingError("unavailable", "Those dates were just taken. Please pick another slot.");
    }
    throw error;
  }
}

export type ChauffeurInput = {
  vehicleId: string;
  startAt: Date;
  endAt: Date;
  name: string;
  email: string;
  phone: string;
  pickupAddress: string;
  dropoffAddress: string;
  passengers: number;
  luggageNotes?: string;
  specialRequests?: string;
};

export async function createChauffeurRequest(input: ChauffeurInput) {
  assertValidRange(input.startAt, input.endAt, "chauffeur");

  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new BookingError("not_found", "That vehicle is no longer available.");

  const quote = quoteChauffeur(vehicle, input.startAt, input.endAt);
  const holds = config.chauffeurHoldsOnRequest; // PRD R5

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      // Even when a request does not hold the vehicle, refuse one that already
      // clashes with a confirmed booking — the trip could never be honoured.
      const conflict = await findConflict(tx, input.vehicleId, input.startAt, input.endAt);
      if (conflict) throw new BookingError("unavailable", conflict.detail);

      const customer = await upsertCustomer(tx, input);

      return tx.reservation.create({
        data: {
          reference: bookingReference("CH"),
          type: "chauffeur",
          status: "pending",
          holdsAvailability: holds,
          vehicleId: vehicle.id,
          customerId: customer.id,
          startAt: input.startAt,
          endAt: input.endAt,
          priceTotal: quote.total,
          depositAmount: 0,
          currency: quote.currency,
          paymentStatus: "unpaid",
          chauffeurTrip: {
            create: {
              pickupAddress: input.pickupAddress,
              dropoffAddress: input.dropoffAddress,
              passengers: input.passengers,
              luggageNotes: input.luggageNotes ?? "",
              specialRequests: input.specialRequests ?? "",
            },
          },
          statusEvents: {
            create: { toStatus: "pending", actor: "customer", note: "Chauffeur request submitted" },
          },
        },
      });
    });

    return { reservation, quote };
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new BookingError("unavailable", "That vehicle was just booked for those dates.");
    }
    throw error;
  }
}

/** PRD N1/N2 — fired after the reservation exists, never blocking the booking. */
export async function notifyNewReservation(reservationId: string) {
  const data = await emailPayload(reservationId);
  await Promise.allSettled([sendCustomerConfirmation(data), sendAdminAlert(data)]);
}

const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export async function changeStatus(
  reservationId: string,
  to: ReservationStatus,
  actor: string,
  note = "",
) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
  });

  if (reservation.status === to) return reservation;
  if (!ALLOWED_TRANSITIONS[reservation.status].includes(to)) {
    throw new BookingError(
      "invalid_transition",
      `Cannot move a ${reservation.status.replace("_", " ")} reservation to ${to.replace("_", " ")}.`,
    );
  }

  // Confirming a chauffeur request is the point at which it takes the vehicle,
  // so re-check the window before committing to it.
  const shouldHold = to === "cancelled" ? false : true;
  if (shouldHold && !reservation.holdsAvailability) {
    const conflict = await findConflict(
      prisma,
      reservation.vehicleId,
      reservation.startAt,
      reservation.endAt,
      { excludeReservationId: reservation.id },
    );
    if (conflict) throw new BookingError("unavailable", conflict.detail);
  }

  try {
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: to,
        holdsAvailability: shouldHold,
        statusEvents: {
          create: { fromStatus: reservation.status, toStatus: to, actor, note },
        },
      },
    });

    if (to === "confirmed" && reservation.type === "chauffeur") {
      await sendChauffeurConfirmed(await emailPayload(reservation.id)).catch(() => {});
    }
    if (to === "cancelled") {
      await sendCancellationNotice(await emailPayload(reservation.id), note).catch(() => {});
    }

    return updated;
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new BookingError("unavailable", "Another booking now occupies those dates.");
    }
    throw error;
  }
}

/** True when the customer is still inside the free-cancellation window (PRD §8). */
export function withinFreeCancellation(startAt: Date) {
  return startAt.getTime() - Date.now() > config.cancellationWindowHours * 3_600_000;
}

export async function rescheduleReservation(
  reservationId: string,
  startAt: Date,
  endAt: Date,
  actor: string,
) {
  const reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  if (endAt <= startAt) {
    throw new BookingError("invalid_range", "The end must be after the start.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const conflict = await findConflict(tx, reservation.vehicleId, startAt, endAt, {
        excludeReservationId: reservation.id,
      });
      if (conflict) throw new BookingError("unavailable", conflict.detail);

      return tx.reservation.update({
        where: { id: reservation.id },
        data: {
          startAt,
          endAt,
          statusEvents: {
            create: {
              fromStatus: reservation.status,
              toStatus: reservation.status,
              actor,
              note: "Dates changed",
            },
          },
        },
      });
    });
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new BookingError("unavailable", "Those dates clash with another booking.");
    }
    throw error;
  }
}
