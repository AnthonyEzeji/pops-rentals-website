# Fleet Reserve

Vehicle rental and chauffeur booking platform — public booking site plus an admin
portal for fleet, reservations, maintenance and expenses. Built against
[docs/PRD.md](docs/PRD.md).

**Stack:** Next.js 16 (App Router, server actions) · TypeScript · Postgres +
Prisma · Tailwind v4 · Stripe Checkout · Resend.

## Getting started

```bash
cp .env.example .env          # then fill in what you need
docker compose up -d          # Postgres on localhost:5432
npm install
npm run db:deploy             # apply migrations
npm run db:seed               # sample fleet, drivers, bookings + admin login
npm run dev
```

Public site: http://localhost:3000 — admin: http://localhost:3000/admin
Seed logins: `owner@fleetreserve.test` / `ChangeMe123!` (owner) and
`staff@fleetreserve.test` / `StaffPass123!` (staff).

Stripe and Resend are optional in development. With no `STRIPE_SECRET_KEY`,
bookings are taken as pay-at-pickup and confirm immediately; with no
`RESEND_API_KEY`, emails are printed to the server console.

## How double-booking is prevented

Three layers, because the application layer alone can race (PRD R1, §14):

1. `findConflict()` runs inside the same transaction as the insert
   ([src/lib/availability.ts](src/lib/availability.ts)), applying the configured
   turnaround buffer and maintenance blocks.
2. A Postgres `EXCLUDE USING gist` constraint on `(vehicleId, tsrange(startAt, endAt))`
   rejects any overlap that slips through
   ([prisma/migrations/20260917000001_booking_constraints](prisma/migrations/20260917000001_booking_constraints/migration.sql)).
3. `23P01` violations are caught and surfaced as "those dates were just taken".

Chauffeur requests do not hold the vehicle until an admin confirms them, unless
`CHAUFFEUR_HOLDS_ON_REQUEST=true` (PRD R5). Confirming re-checks availability.

## Business rules

Everything in PRD §8 is env-configurable — deposit percentage, minimum rental
days, turnaround buffer, cancellation window, currency, timezone, plus the
long-hire discounts (`WEEKLY_DISCOUNT_PERCENT`, default 15, applied at 7+ days;
`MONTHLY_DISCOUNT_PERCENT`, default 25, at 28+ days). See
[src/lib/config.ts](src/lib/config.ts). The published policy page reads the same
values, so the site and the booking engine cannot disagree.

## Look and feel

Light, high-contrast surfaces with neon green (`--color-brand: #00e07a`) used
only for action and "settled" states — primary buttons, focus rings, active
chips, confirmed/available badges, data bars. Because neon green fails contrast
on white, text and links use the deeper `--color-accent`, and anything filled
with the neon uses `--color-brand-ink` on top. All tokens live at the top of
[src/app/globals.css](src/app/globals.css); changing the two green values
re-themes the whole app.

## Layout

```
prisma/schema.prisma          data model (PRD §5)
prisma/seed.ts                sample fleet, drivers, reservations, admin users
src/lib/                      availability, booking, pricing, auth, email, stripe
src/app/(site)/               public: home, fleet, vehicle, booking, confirmation, policies
src/app/admin/(portal)/       admin: dashboard, reservations + calendar, requests,
                              vehicles, drivers, maintenance, expenses, reports
src/app/api/stripe/webhook/   payment confirmation (signature-verified)
src/app/api/admin/export/     CSV export (owner only)
src/middleware.ts             admin route guard
```

## Payments

`/api/stripe/webhook` is the only thing that marks a reservation paid. Point
Stripe at it and set `STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Handled events: `checkout.session.completed` (confirm + email),
`checkout.session.expired` (release the held dates), `charge.refunded`.

## Still to do before launch

- Photo uploads to S3 (admin currently takes photo URLs), then re-enable the
  Next image optimizer for that host in `next.config.ts`.
- Swap the in-process rate limiter for Redis/Upstash if running more than one instance.
- Customer accounts, SMS reminders, staff management UI (PRD phase 2).
- Fill in the PRD §8 placeholders and have the policy wording reviewed.
