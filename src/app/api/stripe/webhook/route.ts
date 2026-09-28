import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendCustomerConfirmation } from "@/lib/email";
import { vehicleLabel } from "@/lib/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe is the source of truth for payment (PRD P8, §7.3 — no card data ever
 * reaches this app). The signature check is mandatory: without it anyone could
 * mark a reservation paid.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    console.error("[stripe] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await markPaid(event.data.object);
        break;
      }
      case "checkout.session.expired": {
        await releaseExpired(event.data.object);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        if (charge.payment_intent) {
          await prisma.reservation.updateMany({
            where: { stripePaymentIntentId: String(charge.payment_intent) },
            data: { paymentStatus: "refunded" },
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // Returning 500 makes Stripe retry, which is what we want for a transient
    // database problem.
    console.error(`[stripe] handler failed for ${event.type}`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function markPaid(session: Stripe.Checkout.Session) {
  const reservationId = session.client_reference_id ?? session.metadata?.reservationId;
  if (!reservationId) return;

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { vehicle: true, customer: true },
  });
  if (!reservation) return;
  // Stripe retries; confirming twice must not double-count the payment.
  if (reservation.paymentStatus !== "unpaid") return;

  const amountPaid = session.amount_total ?? reservation.depositAmount;
  const paidInFull = amountPaid >= reservation.priceTotal;

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: reservation.status === "pending" ? "confirmed" : reservation.status,
      holdsAvailability: true,
      amountPaid,
      paymentStatus: paidInFull ? "paid_in_full" : "deposit_paid",
      stripePaymentIntentId: session.payment_intent ? String(session.payment_intent) : null,
      statusEvents: {
        create: {
          fromStatus: reservation.status,
          toStatus: "confirmed",
          actor: "stripe",
          note: `Payment received (${amountPaid})`,
        },
      },
    },
  });

  await sendCustomerConfirmation({
    reference: reservation.reference,
    type: reservation.type,
    customerName: reservation.customer.name,
    customerEmail: reservation.customer.email,
    vehicleLabel: vehicleLabel(reservation.vehicle),
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    priceTotal: reservation.priceTotal,
    amountPaid,
    securityDeposit: reservation.securityDeposit,
    currency: reservation.currency,
  }).catch(() => {});
}

/**
 * An abandoned checkout must not keep holding the vehicle, or one dropped
 * browser tab blocks the dates for everyone else.
 */
async function releaseExpired(session: Stripe.Checkout.Session) {
  const reservationId = session.client_reference_id ?? session.metadata?.reservationId;
  if (!reservationId) return;

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation || reservation.status !== "pending" || reservation.paymentStatus !== "unpaid") {
    return;
  }

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: "cancelled",
      holdsAvailability: false,
      statusEvents: {
        create: {
          fromStatus: "pending",
          toStatus: "cancelled",
          actor: "stripe",
          note: "Checkout expired without payment",
        },
      },
    },
  });
}
