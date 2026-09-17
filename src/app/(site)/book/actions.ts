"use server";

import { redirect } from "next/navigation";
import { BookingError } from "@/lib/availability";
import {
  createChauffeurRequest,
  createSelfDriveReservation,
  notifyNewReservation,
  vehicleLabel,
} from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/rate-limit";
import { createCheckoutSession, stripeEnabled } from "@/lib/stripe";
import { chauffeurRequestSchema, fieldErrors, selfDriveBookingSchema } from "@/lib/validation";

export type BookingFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** PRD P4–P9: validate → hold the vehicle → take payment → confirm. */
export async function submitSelfDriveBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  let destination: string;

  try {
    await guard("book", 10, 60_000);

    const parsed = selfDriveBookingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    }
    const input = parsed.data;

    if (input.licenseExpiry.getTime() < input.endAt.getTime()) {
      return {
        error: "Your licence expires before the return date.",
        fieldErrors: { licenseExpiry: "The licence must be valid for the whole rental." },
      };
    }

    const { reservation, quote } = await createSelfDriveReservation(input);
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: input.vehicleId } });

    if (stripeEnabled && quote.deposit > 0) {
      const session = await createCheckoutSession({
        reservationId: reservation.id,
        reference: reservation.reference,
        vehicleLabel: vehicleLabel(vehicle),
        amount: quote.deposit,
        currency: quote.currency,
        customerEmail: input.email,
        description: `${quote.unitLabel} self-drive hire`,
      });

      if (session?.url) {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { stripeSessionId: session.id },
        });
        destination = session.url;
      } else {
        destination = `/confirmation/${reservation.reference}`;
      }
    } else {
      // No payment provider configured: the booking stands as pay-at-pickup.
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: "confirmed",
          statusEvents: {
            create: {
              fromStatus: "pending",
              toStatus: "confirmed",
              actor: "system",
              note: "Pay at pickup",
            },
          },
        },
      });
      destination = `/confirmation/${reservation.reference}`;
    }

    await notifyNewReservation(reservation.id);
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };
    console.error("[book:self-drive]", error);
    return { error: "Something went wrong taking your booking. Please try again." };
  }

  redirect(destination);
}

/** PRD P7: a chauffeur request is a pending enquiry until an admin confirms it. */
export async function submitChauffeurRequest(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  let reference: string;

  try {
    await guard("request", 10, 60_000);

    const parsed = chauffeurRequestSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: parsed.data.vehicleId } });
    if (!vehicle) return { error: "That vehicle is no longer available." };
    if (parsed.data.passengers > vehicle.seats) {
      return {
        error: `That vehicle seats ${vehicle.seats}.`,
        fieldErrors: { passengers: `Maximum ${vehicle.seats} passengers.` },
      };
    }

    const { reservation } = await createChauffeurRequest(parsed.data);
    await notifyNewReservation(reservation.id);
    reference = reservation.reference;
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };
    console.error("[book:chauffeur]", error);
    return { error: "Something went wrong sending your request. Please try again." };
  }

  redirect(`/confirmation/${reference}`);
}
