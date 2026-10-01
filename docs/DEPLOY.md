# Deploying to Vercel

Work top to bottom. Anything marked **blocker** will break the site or lose
money if it is skipped.

## 1. Repository

- [ ] **blocker** Delete `src/app/page.tsx`. It is the leftover create-next-app
      entry point and resolves to the same `/` route as
      `src/app/(site)/page.tsx`. Both currently render the same content so the
      site works, but it is ambiguous and should not ship.
- [ ] Commit everything and push to GitHub — Vercel deploys from a remote, and
      this repo has none yet (`git remote -v` is empty).
- [ ] Confirm `.env` is not committed (it is in `.gitignore`) and that
      `photo-originals/` is ignored too — it holds the full-size photo backups
      and does not need deploying.

## 2. Database

The Docker Postgres in `docker-compose.yml` is for local development only — it
lives on your machine and is not reachable from Vercel. Production needs a
hosted Postgres.

### Which provider

Two hard requirements come from this app:

1. **The `btree_gist` extension.** The constraint that makes double-booking
   impossible (`prisma/migrations/20260917000001_booking_constraints`) cannot be
   created without it. Any managed Postgres that blocks extensions is unusable
   here.
2. **A connection pooler.** Every Vercel function opens its own connection, and
   a few concurrent visitors will exhaust a normal connection limit. The
   provider needs a built-in pooler (PgBouncer), or you need to run one.

**Supabase** is the choice here. It satisfies both requirements and bundles
object storage, which is where vehicle photos should live once they outgrow the
repo (PRD §7.1) — one less service to add later. **Neon** is an equally valid
alternative if you only ever want a database.

**Railway** is a worse fit *for a Vercel deployment*: its Postgres ships no
managed connection pooler, so you would run PgBouncer yourself as a second
service to solve a problem Supabase and Neon solve out of the box. It also has
no object storage, so photos would still need R2 or S3. Railway becomes the
right answer only if the **app** moves there too — a long-running Node server
holds a small, stable pool, which makes the pooler moot, and the database sits
on the private network. That is a decision about where to host the app, not
just the database.

Put the project in **the same region as your Vercel functions** (`us-east-1`
for a New York business). A database in another region adds a round trip to
every query on every page.

### Setting it up (Supabase)

- [ ] Create the project in `us-east-1`. Save the database password it shows
      you once — it is not shown again.
- [ ] **Confirm the extension is available before going further.** Run this in
      the Supabase SQL editor:

      ```sql
      select name, default_version from pg_available_extensions
      where name = 'btree_gist';
      ```

      One row back means the no-double-booking constraint will build. Do not
      create the extension by hand — the migration does it, in the right
      schema, with `CREATE EXTENSION IF NOT EXISTS`.
- [ ] Grab both connection strings from Connect → ORMs → Prisma. For a
      serverless host like Vercel they are:

      **blocker** `DATABASE_URL` — Supavisor **transaction** mode, port `6543`,
      and the `pgbouncer=true` parameter is required (it tells Prisma to stop
      using prepared statements, which transaction pooling cannot support):

      ```
      postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
      ```

      **blocker** `DIRECT_URL` — Supavisor **session** mode, port `5432`, for
      migrations:

      ```
      postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
      ```

      Use the pooler host for both. The older `db.[PROJECT-REF].supabase.co`
      direct host resolves over IPv6 only unless you buy the IPv4 add-on, so it
      will fail from most machines and CI runners.
- [ ] **blocker** Add the direct URL to `prisma/schema.prisma`:

      ```prisma
      datasource db {
        provider  = "postgresql"
        url       = env("DATABASE_URL")   // pooled — used at runtime
        directUrl = env("DIRECT_URL")     // direct — used by migrations
      }
      ```

      Prisma errors on every CLI command once `directUrl` exists but
      `DIRECT_URL` is unset, so add it to your local `.env` at the same time.
      Locally both can point at the same Docker database:

      ```
      DATABASE_URL="postgresql://fleet:fleet@127.0.0.1:55432/fleet_reserve?schema=public"
      DIRECT_URL="postgresql://fleet:fleet@127.0.0.1:55432/fleet_reserve?schema=public"
      ```

- [ ] Run the migrations against the hosted database once, from your machine:

      ```bash
      DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npx prisma migrate deploy
      ```

- [ ] **Verify the anti-double-booking constraint actually exists** — if the
      extension were blocked, the migration fails and the site silently loses
      its strongest guarantee:

      ```sql
      SELECT conname FROM pg_constraint WHERE conname = 'Reservation_no_overlap';
      SELECT extname FROM pg_extension WHERE extname = 'btree_gist';
      ```

      Both should return one row.
- [ ] Seed the fleet and owner account, with a password only you know:

      ```bash
      DATABASE_URL="<pooled>" DIRECT_URL="<direct>" \
        SEED_ADMIN_EMAIL="you@yourdomain.com" \
        SEED_ADMIN_PASSWORD="<a real password>" \
        npx prisma db seed
      ```

      The seed refuses to run on a deployed database without
      `SEED_ADMIN_PASSWORD`, because its fallback password is in this repo.
- [ ] Check the backup policy on whatever tier you chose. Supabase's free tier
      does not include point-in-time recovery, and paused free projects can be
      deleted after a period of inactivity. Reservations and customer records
      are the business — treat paid-tier backups as a launch requirement, not a
      nicety.
- [ ] Ignore the rest of Supabase for now. This app talks to Postgres through
      Prisma with its own session auth; it does not use Supabase Auth, RLS or
      the PostgREST API, and turning those on is not needed. Storage is the one
      piece worth adopting later, for vehicle photos.
- [ ] Keep developing against Docker. Pointing local work at the production
      database risks a stray `db push` or reseed wiping live bookings.

### Why the pooler settings matter here

The booking path (`createSelfDriveReservation` in `src/lib/booking.ts`) runs the
conflict check and the insert inside one interactive transaction — that is what
stops two customers taking the same car. Transaction-mode pooling is compatible
with this, because the pooler dedicates a backend connection for the duration of
an explicit transaction, but two things follow:

- `pgbouncer=true` is not optional. Without it Prisma caches prepared statements
  that the pooler will hand to a different backend, and you get intermittent
  `prepared statement "s0" already exists` errors under load.
- Keep those transactions short. Every in-flight booking holds a pooled
  connection until it commits.

If bookings start failing in production, check these before suspecting the
availability logic.

## 3. Environment variables

Set these in Vercel → Settings → Environment Variables. `NEXT_PUBLIC_*` values
are read at build time, so redeploy after changing them.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | **blocker** pooled connection string |
| `DIRECT_URL` | **blocker** direct connection, for migrations |
| `SESSION_SECRET` | **blocker** 32+ random chars — see "Session secret" below |
| `TZ` | **blocker** must equal `BUSINESS_TIMEZONE`, e.g. `America/New_York`. Vercel defaults to UTC; if they disagree every booking shifts by the offset. The app refuses to boot on Vercel if they do not match. |
| `BUSINESS_TIMEZONE` | Same value as `TZ` |
| `APP_URL` | **blocker** The site's public URL — `https://your-project.vercel.app` until you own a domain. Stripe redirects and email links are built from it; a wrong value sends paying customers to localhost. Update it the day the domain goes live. |
| `NEXT_PUBLIC_BUSINESS_NAME` | `Pops Rentals` |
| `NEXT_PUBLIC_CURRENCY` | e.g. `USD` |
| `NEXT_PUBLIC_BUSINESS_PHONE` / `_EMAIL` / `_ADDRESS` | Shown in header and footer; hidden when blank |
| `NEXT_PUBLIC_INSTAGRAM` | `@popsrentals_` |
| `SELF_DRIVE_DEPOSIT_PERCENT`, `MIN_RENTAL_DAYS`, `BOOKING_BUFFER_MINUTES`, `CANCELLATION_WINDOW_HOURS`, `WEEKLY_DISCOUNT_PERCENT`, `MONTHLY_DISCOUNT_PERCENT`, `CHAUFFEUR_HOLDS_ON_REQUEST` | Business rules; defaults in `src/lib/config.ts` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | See below |
| `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` | See below |

### Session secret

This string signs admin session cookies. Anyone holding it can mint a valid
owner session without a password, so it must be random and must never be
shared between environments or pasted into chat, a ticket or a commit.

Generate one and paste it straight into Vercel:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

The app enforces this: on Vercel it refuses to start if `SESSION_SECRET` is
under 32 characters or looks like a placeholder (`change-me`, `dev-only`,
`placeholder`…). Locally it only warns, so the example value keeps working.

Rotating the secret invalidates every signed-in session immediately — which is
also the only way to force everyone out, since sessions cannot be revoked
individually.

## 4. Payments

With no `STRIPE_SECRET_KEY`, bookings confirm immediately as pay-at-pickup —
the site takes no money. That is fine for launch, but decide deliberately.

- [ ] Add the live secret key.
- [ ] Add a webhook endpoint in the Stripe dashboard pointing at
      `https://yourdomain.com/api/stripe/webhook`, subscribed to
      `checkout.session.completed`, `checkout.session.expired` and
      `charge.refunded`.
- [ ] **blocker** Copy that endpoint's signing secret into
      `STRIPE_WEBHOOK_SECRET`. Without it the route returns 503 and paid
      bookings are never confirmed.
- [ ] Take one real test booking end to end before announcing the site.

## 5. Email

**Email is the one thing that genuinely needs a domain.** Resend will not let
you send to arbitrary recipients from a shared test address — `onboarding@
resend.dev` only reaches the address on your own Resend account. So until you
own a domain:

- Customers receive **no** confirmation email. The booking still completes and
  still appears in the admin; the email is simply logged to the Vercel function
  logs instead.
- You can still get the *admin* notification, by pointing
  `ADMIN_NOTIFICATION_EMAIL` at the address registered with Resend.

Treat "buy a domain" as the gate for taking real customer bookings, not for
deploying. A `.co`/`.com` is about $12 a year, and it also stops customers being
asked to hand a credit card to a `.vercel.app` address.

Once you have one:

- [ ] Add the domain in Vercel → Settings → Domains, and update `APP_URL`.
- [ ] Verify the same domain in Resend (it walks you through the DNS records).
- [ ] Set `EMAIL_FROM` to an address on it, e.g.
      `Pops Rentals <bookings@yourdomain.com>`.
- [ ] Set `ADMIN_NOTIFICATION_EMAIL` so new bookings reach a person.
- [ ] Send yourself one real booking to confirm both emails arrive.

## 5b. Locking the site

`SITE_LOCKED=true` makes every route answer 404 — public pages, the admin
portal, the API and the vehicle photos. It is a switch, not a deletion: the
code, the database, the bookings and the images are untouched.

| | |
|---|---|
| **Lock** | Set `SITE_LOCKED=true` in Vercel, then redeploy |
| **Unlock** | Delete `SITE_LOCKED` (or set it to anything else), then redeploy |
| **Look at it while locked** | Set `SITE_UNLOCK_KEY` to a secret of your choosing, then visit `https://…/?access=<key>` once. The key is stored in a cookie for 30 days and stripped from the URL. |

Environment changes only take effect on a new deployment, so both directions
need a redeploy (`vercel deploy --prod`). Nothing else changes: unlocking
restores the site exactly as it was, with every reservation and customer intact.

Note for whoever operates the business: while it is locked, **they cannot reach
the admin either**, so they cannot see today's pickups or returns.

## 6. Known gaps to close soon after launch

- **Rate limiting is per-instance.** `src/lib/rate-limit.ts` keeps counters in
  memory, so on serverless each function instance counts separately and the
  limits are far weaker than they look. Move to Upstash Redis before the site
  gets real traffic.
- **Sessions cannot be revoked.** Tokens are self-contained and valid for 8
  hours; deactivating a staff account does not end their current session.
- **Photos are in the repo.** They deploy with the app, so adding photos means
  a code deploy. Object storage (PRD §7.1) plus admin upload is the fix.
- **`middleware.ts` is deprecated** in Next 16 in favour of `proxy.ts`. It
  works, but migrate with `npx @next/codemod@canary middleware-to-proxy .`

## 7. Before the first customer

- [ ] Change the seeded admin passwords.
- [ ] Replace the placeholder plates (`FR-1001`…) with the real registrations.
- [ ] Read `/policies` end to end — the wording is a starting point I drafted,
      not legal advice, and the deposit and cancellation numbers there come from
      your environment variables.
