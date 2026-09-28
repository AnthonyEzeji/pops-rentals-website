"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { destroySession, requireAdmin, requireOwner } from "@/lib/auth";
import { BookingError, findConflict, isOverlapViolation, quoteSelfDrive } from "@/lib/availability";
import { changeStatus, rescheduleReservation } from "@/lib/booking";
import { bookingReference, slugify } from "@/lib/reference";
import { parseBusinessDateTime } from "@/lib/dates";
import { toMinorUnits } from "@/lib/money";
import {
  blockSchema,
  customerRecordSchema,
  driverSchema,
  expenseSchema,
  fieldErrors,
  maintenanceSchema,
  vehicleSchema,
} from "@/lib/validation";

export type ActionState = { error?: string; ok?: string; fieldErrors?: Record<string, string> };

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

function refresh(...paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

function fail(error: unknown, fallback: string): ActionState {
  if (error instanceof BookingError) return { error: error.message };
  if (isOverlapViolation(error)) return { error: "Those dates clash with an existing booking." };
  console.error("[admin]", error);
  return { error: fallback };
}

function splitLines(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Reservations                                                        */
/* ------------------------------------------------------------------ */

const RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export async function setReservationStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "");

  if (!(RESERVATION_STATUSES as readonly string[]).includes(raw)) {
    return { error: "Unknown status." };
  }
  const status = raw as (typeof RESERVATION_STATUSES)[number];

  try {
    await changeStatus(id, status, session.email, note);
    refresh("/admin", "/admin/reservations", "/admin/requests", `/admin/reservations/${id}`);
    return { ok: `Reservation marked ${status.replace("_", " ")}.` };
  } catch (error) {
    return fail(error, "Could not update that reservation.");
  }
}

export async function assignDriver(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const reservationId = String(formData.get("reservationId") ?? "");
  const driverId = String(formData.get("driverId") ?? "");

  try {
    const trip = await prisma.chauffeurTrip.findUnique({ where: { reservationId } });
    if (!trip) return { error: "That reservation is not a chauffeur trip." };

    await prisma.chauffeurTrip.update({
      where: { reservationId },
      data: { driverId: driverId || null },
    });
    await prisma.reservationEvent.create({
      data: {
        reservationId,
        toStatus: (await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } }))
          .status,
        actor: session.email,
        note: driverId ? "Driver assigned" : "Driver unassigned",
      },
    });

    refresh("/admin/requests", "/admin/reservations", `/admin/reservations/${reservationId}`);
    return { ok: driverId ? "Driver assigned." : "Driver removed." };
  } catch (error) {
    return fail(error, "Could not assign that driver.");
  }
}

export async function updateReservationPrice(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const priceTotal = toMinorUnits(String(formData.get("priceTotal") ?? "0"));
  const amountPaid = toMinorUnits(String(formData.get("amountPaid") ?? "0"));

  if (priceTotal < 0 || amountPaid < 0) return { error: "Amounts cannot be negative." };
  if (amountPaid > priceTotal) return { error: "Paid cannot exceed the total." };

  try {
    await prisma.reservation.update({
      where: { id },
      data: {
        priceTotal,
        amountPaid,
        paymentStatus:
          amountPaid === 0 ? "unpaid" : amountPaid >= priceTotal ? "paid_in_full" : "deposit_paid",
      },
    });
    refresh("/admin/reservations", `/admin/reservations/${id}`, "/admin/requests");
    return { ok: "Price updated." };
  } catch (error) {
    return fail(error, "Could not update the price.");
  }
}

export async function rescheduleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const startAt = parseBusinessDateTime(String(formData.get("startAt") ?? ""));
  const endAt = parseBusinessDateTime(String(formData.get("endAt") ?? ""));

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return { error: "Enter valid dates." };
  }

  try {
    await rescheduleReservation(id, startAt, endAt, session.email);
    refresh("/admin/reservations", `/admin/reservations/${id}`);
    return { ok: "Dates updated." };
  } catch (error) {
    return fail(error, "Could not change those dates.");
  }
}

/** Admin-created booking (walk-in or phone). PRD A5. */
export async function createReservationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const startAt = parseBusinessDateTime(String(formData.get("startAt") ?? ""));
  const endAt = parseBusinessDateTime(String(formData.get("endAt") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const type = String(formData.get("type") ?? "self_drive") as "self_drive" | "chauffeur";
  const notes = String(formData.get("notes") ?? "");

  if (!vehicleId || !name || !email || !phone) return { error: "Fill in every required field." };
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return { error: "Enter a valid date range." };
  }

  let reference: string;
  try {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    const quote = quoteSelfDrive(vehicle, startAt, endAt);

    const reservation = await prisma.$transaction(async (tx) => {
      const conflict = await findConflict(tx, vehicleId, startAt, endAt);
      if (conflict) throw new BookingError("unavailable", conflict.detail);

      const existing = await tx.customer.findFirst({ where: { email } });
      const customer = existing
        ? await tx.customer.update({ where: { id: existing.id }, data: { name, phone } })
        : await tx.customer.create({ data: { name, email, phone } });

      return tx.reservation.create({
        data: {
          reference: bookingReference(type === "chauffeur" ? "CH" : "PR"),
          type,
          status: "confirmed",
          holdsAvailability: true,
          vehicleId,
          customerId: customer.id,
          startAt,
          endAt,
          priceTotal: quote.total,
          depositAmount: quote.deposit,
          currency: quote.currency,
          notes,
          ...(type === "chauffeur"
            ? {
                chauffeurTrip: {
                  create: {
                    pickupAddress: String(formData.get("pickupAddress") ?? ""),
                    dropoffAddress: String(formData.get("dropoffAddress") ?? ""),
                    passengers: Number(formData.get("passengers") ?? 1) || 1,
                  },
                },
              }
            : {}),
          statusEvents: {
            create: { toStatus: "confirmed", actor: session.email, note: "Created in admin" },
          },
        },
      });
    });
    reference = reservation.reference;
  } catch (error) {
    return fail(error, "Could not create that reservation.");
  }

  refresh("/admin", "/admin/reservations");
  return { ok: `Reservation ${reference} created.` };
}

/* ------------------------------------------------------------------ */
/* Vehicles                                                            */
/* ------------------------------------------------------------------ */

export async function saveVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;

  const data: Prisma.VehicleUncheckedCreateInput = {
    slug: slugify(`${input.year}-${input.make}-${input.model}-${input.plate}`),
    make: input.make,
    model: input.model,
    year: input.year,
    plate: input.plate.toUpperCase(),
    vin: input.vin || null,
    category: input.category,
    seats: input.seats,
    transmission: input.transmission,
    fuelType: input.fuelType,
    status: input.status,
    dailyRateSelfDrive: toMinorUnits(input.dailyRateSelfDrive),
    chauffeurHourlyRate: input.chauffeurHourlyRate ? toMinorUnits(input.chauffeurHourlyRate) : null,
    chauffeurDayRate: input.chauffeurDayRate ? toMinorUnits(input.chauffeurDayRate) : null,
    odometer: input.odometer ?? null,
    engine: input.engine || null,
    horsepower: input.horsepower ?? null,
    zeroToSixty: input.zeroToSixty ?? null,
    topSpeed: input.topSpeed ?? null,
    features: splitLines(input.features ?? ""),
    photos: splitLines(input.photos ?? ""),
    description: input.description ?? "",
  };

  try {
    if (id) {
      // The slug is part of public URLs, so it is set once and left alone.
      const { slug: _slug, ...updatable } = data;
      await prisma.vehicle.update({ where: { id }, data: updatable });
    } else {
      await prisma.vehicle.create({ data });
    }
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { error: "A vehicle with that registration already exists." };
    }
    return fail(error, "Could not save that vehicle.");
  }

  refresh("/admin/vehicles", "/vehicles", "/");
  redirect("/admin/vehicles?saved=1");
}

const VEHICLE_STATUSES = ["available", "reserved", "maintenance", "out_of_service"] as const;

export async function setVehicleStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!(VEHICLE_STATUSES as readonly string[]).includes(status)) return;

  await prisma.vehicle.update({
    where: { id },
    data: { status: status as (typeof VEHICLE_STATUSES)[number] },
  });
  refresh("/admin/vehicles", "/vehicles", "/");
}

export async function deleteVehicle(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id") ?? "");

  // History matters for reporting, so a vehicle with bookings is retired rather
  // than deleted.
  const bookings = await prisma.reservation.count({ where: { vehicleId: id } });
  if (bookings > 0) {
    await prisma.vehicle.update({ where: { id }, data: { status: "out_of_service" } });
  } else {
    await prisma.vehicle.delete({ where: { id } });
  }

  refresh("/admin/vehicles", "/vehicles", "/");
}

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

export async function saveCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = customerRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;
  const email = input.email.toLowerCase().trim();

  const data = {
    name: input.name,
    email,
    phone: input.phone,
    licenseNumber: input.licenseNumber || null,
    licenseExpiry: input.licenseExpiry instanceof Date ? input.licenseExpiry : null,
    licenseCountry: input.licenseCountry || null,
  };

  try {
    if (input.id) {
      await prisma.customer.update({ where: { id: input.id }, data });
    } else {
      // One record per email: re-adding someone updates them rather than
      // creating a duplicate that splits their history.
      const existing = await prisma.customer.findFirst({ where: { email } });
      if (existing) {
        await prisma.customer.update({ where: { id: existing.id }, data });
        refresh("/admin/customers");
        return { ok: `${input.name} already had a record — updated it instead.` };
      }
      await prisma.customer.create({ data });
    }
  } catch (error) {
    return fail(error, "Could not save that customer.");
  }

  refresh("/admin/customers", "/admin/reservations/new");
  return { ok: input.id ? "Customer updated." : `${input.name} saved.` };
}

export async function deleteCustomer(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id") ?? "");

  // Their booking history references them, so only unused records can go.
  const bookings = await prisma.reservation.count({ where: { customerId: id } });
  if (bookings > 0) return;

  await prisma.customer.delete({ where: { id } });
  refresh("/admin/customers");
}

/* ------------------------------------------------------------------ */
/* Drivers                                                             */
/* ------------------------------------------------------------------ */

export async function saveDriver(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const parsed = driverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const data = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    licenseNumber: parsed.data.licenseNumber,
    active: Boolean(formData.get("active")),
    notes: parsed.data.notes ?? "",
  };

  try {
    if (id) await prisma.driver.update({ where: { id }, data });
    else await prisma.driver.create({ data });
  } catch (error) {
    return fail(error, "Could not save that driver.");
  }

  refresh("/admin/drivers");
  return { ok: id ? "Driver updated." : "Driver added." };
}

export async function toggleDriver(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const driver = await prisma.driver.findUniqueOrThrow({ where: { id } });
  await prisma.driver.update({ where: { id }, data: { active: !driver.active } });
  refresh("/admin/drivers");
}

/* ------------------------------------------------------------------ */
/* Maintenance & blocks                                                */
/* ------------------------------------------------------------------ */

export async function addMaintenance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = maintenanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.maintenanceRecord.create({
        data: {
          vehicleId: input.vehicleId,
          date: input.date,
          type: input.type,
          description: input.description ?? "",
          cost: toMinorUnits(input.cost ?? 0),
          odometer: input.odometer ?? null,
          nextDueDate: input.nextDueDate instanceof Date ? input.nextDueDate : null,
          nextDueOdometer: input.nextDueOdometer ?? null,
        },
      });

      // Logging work usually means the vehicle is off the road for a while —
      // block those dates so it stops appearing as bookable (PRD A10/R2).
      if (input.blockStartAt instanceof Date && input.blockEndAt instanceof Date) {
        if (input.blockEndAt <= input.blockStartAt) {
          throw new BookingError("invalid_range", "The block must end after it starts.");
        }
        const conflict = await findConflict(
          tx,
          input.vehicleId,
          input.blockStartAt,
          input.blockEndAt,
        );
        if (conflict) {
          throw new BookingError(
            "unavailable",
            `Cannot block those dates: ${conflict.detail.toLowerCase()}`,
          );
        }
        await tx.vehicleBlock.create({
          data: {
            vehicleId: input.vehicleId,
            startAt: input.blockStartAt,
            endAt: input.blockEndAt,
            reason: "maintenance",
            note: input.type,
          },
        });
      }

      if (input.odometer) {
        await tx.vehicle.update({
          where: { id: input.vehicleId },
          data: { odometer: input.odometer },
        });
      }
    });
  } catch (error) {
    return fail(error, "Could not save that maintenance record.");
  }

  refresh("/admin/maintenance", "/admin/vehicles", "/vehicles", "/admin");
  return { ok: "Maintenance logged." };
}

export async function addBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = blockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;
  if (input.endAt <= input.startAt) return { error: "The block must end after it starts." };

  try {
    await prisma.$transaction(async (tx) => {
      const conflict = await findConflict(tx, input.vehicleId, input.startAt, input.endAt);
      if (conflict) {
        throw new BookingError(
          "unavailable",
          `Cannot block those dates: ${conflict.detail.toLowerCase()}`,
        );
      }
      await tx.vehicleBlock.create({
        data: {
          vehicleId: input.vehicleId,
          startAt: input.startAt,
          endAt: input.endAt,
          reason: input.reason,
          note: input.note ?? "",
        },
      });
      if (input.reason === "out_of_service") {
        await tx.vehicle.update({
          where: { id: input.vehicleId },
          data: { status: "out_of_service" },
        });
      }
    });
  } catch (error) {
    return fail(error, "Could not block those dates.");
  }

  refresh("/admin/maintenance", "/admin/vehicles", "/vehicles", "/admin");
  return { ok: "Dates blocked." };
}

export async function removeBlock(formData: FormData) {
  await requireAdmin();
  await prisma.vehicleBlock.delete({ where: { id: String(formData.get("id") ?? "") } });
  refresh("/admin/maintenance", "/admin/vehicles", "/vehicles");
}

/* ------------------------------------------------------------------ */
/* Expenses (owner only — they drive the P&L)                          */
/* ------------------------------------------------------------------ */

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOwner();

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;

  try {
    await prisma.expense.create({
      data: {
        vehicleId: input.vehicleId || null,
        date: input.date,
        category: input.category,
        amount: toMinorUnits(input.amount),
        vendor: input.vendor ?? "",
        notes: input.notes ?? "",
        receiptUrl: input.receiptUrl || null,
      },
    });
  } catch (error) {
    return fail(error, "Could not save that expense.");
  }

  refresh("/admin/expenses", "/admin/reports");
  return { ok: "Expense recorded." };
}

export async function deleteExpense(formData: FormData) {
  await requireOwner();
  await prisma.expense.delete({ where: { id: String(formData.get("id") ?? "") } });
  refresh("/admin/expenses", "/admin/reports");
}
