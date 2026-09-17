// Business rules (PRD §8). Every value is env-overridable so the operator can
// settle the open questions without a code change.

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export const config = {
  businessName: process.env.NEXT_PUBLIC_BUSINESS_NAME || "Pops Rentals",
  currency: process.env.NEXT_PUBLIC_CURRENCY || "USD",
  timezone: process.env.BUSINESS_TIMEZONE || "UTC",
  appUrl: process.env.APP_URL || "http://localhost:3000",

  // Contact details shown in the header, footer and confirmation emails.
  // Anything left blank is simply not rendered.
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "",
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "",
  openingHours: process.env.NEXT_PUBLIC_OPENING_HOURS || "Open 7 days · 9:00 AM – 9:00 PM",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM || "@popsrentals_",

  /** Percentage of the total taken at booking. 0 means pay in full. */
  selfDriveDepositPercent: num(process.env.SELF_DRIVE_DEPOSIT_PERCENT, 25),
  /** PRD R4 — minimum rental duration. */
  minRentalDays: num(process.env.MIN_RENTAL_DAYS, 1),
  /** PRD R3 — turnaround gap enforced between two bookings of one vehicle. */
  bookingBufferMinutes: num(process.env.BOOKING_BUFFER_MINUTES, 120),
  /** PRD §8 — free cancellation up to this many hours before pickup. */
  cancellationWindowHours: num(process.env.CANCELLATION_WINDOW_HOURS, 48),
  /** PRD R5 — whether a pending chauffeur request occupies the vehicle. */
  chauffeurHoldsOnRequest: bool(process.env.CHAUFFEUR_HOLDS_ON_REQUEST, false),
  /** Long-hire discounts, applied to the daily rate at 7+ and 28+ days. */
  weeklyDiscountPercent: num(process.env.WEEKLY_DISCOUNT_PERCENT, 15),
  monthlyDiscountPercent: num(process.env.MONTHLY_DISCOUNT_PERCENT, 25),
  maxAdvanceBookingDays: num(process.env.MAX_ADVANCE_BOOKING_DAYS, 365),
} as const;

export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
export const emailEnabled = Boolean(process.env.RESEND_API_KEY);

/**
 * The app does not depend on the server's timezone. Booking times arrive as
 * naive wall-clock strings and are resolved against BUSINESS_TIMEZONE by
 * `parseBusinessDateTime`, and every displayed time is formatted with an
 * explicit `timeZone`. That matters because Vercel runs functions in UTC and
 * treats TZ as a reserved variable, so it cannot be changed there.
 *
 * Set BUSINESS_TIMEZONE to where the business operates, e.g. America/New_York.
 */
