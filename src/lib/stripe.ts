import "server-only";
import Stripe from "stripe";
import { config, stripeEnabled } from "./config";

export const stripe = stripeEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY as string)
  : null;

export { stripeEnabled };

type CheckoutInput = {
  reservationId: string;
  reference: string;
  vehicleLabel: string;
  amount: number; // minor units
  currency: string;
  customerEmail: string;
  description: string;
};

/**
 * Returns the URL to redirect the customer to, or null when Stripe is not
 * configured — in that case the booking is taken as "pay at pickup" so the
 * whole flow still works in development (PRD P8).
 */
export async function createCheckoutSession(
  input: CheckoutInput,
): Promise<{ id: string; url: string | null } | null> {
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    client_reference_id: input.reservationId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amount,
          product_data: {
            name: `${input.vehicleLabel} — ${input.reference}`,
            description: input.description,
          },
        },
      },
    ],
    metadata: { reservationId: input.reservationId, reference: input.reference },
    success_url: `${config.appUrl}/confirmation/${input.reference}?paid=1`,
    cancel_url: `${config.appUrl}/confirmation/${input.reference}?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  return { id: session.id, url: session.url };
}
