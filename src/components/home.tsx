import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { VehicleCard } from "@/components/vehicle-card";
import { SearchWidget } from "@/components/search-widget";
import { isRemoteImage } from "@/lib/images";
import {
  CalendarCheckIcon,
  CardIcon,
  ChatIcon,
  KeyIcon,
  LicenceIcon,
  PlaneIcon,
  ShieldUserIcon,
  TagIcon,
  WrenchIcon,
} from "@/components/icons";

/**
 * Home page body, without the site header and footer, so it can be rendered
 * both from the (site) route group and from the root route.
 */
export async function HomeContent() {
  const [vehicles, fleetSize, byMake] = await Promise.all([
    // Lead with the flagship cars — they are what people come to look at.
    prisma.vehicle.findMany({
      where: { status: { in: ["available", "reserved"] } },
      orderBy: { dailyRateSelfDrive: "desc" },
      take: 6,
    }),
    prisma.vehicle.count({ where: { status: { not: "out_of_service" } } }),
    prisma.vehicle.groupBy({
      by: ["make"],
      where: { status: { not: "out_of_service" } },
      _count: { _all: true },
      _min: { dailyRateSelfDrive: true },
      orderBy: { _min: { dailyRateSelfDrive: "desc" } },
    }),
  ]);

  const makes = byMake.map((row) => ({
    name: row.make,
    count: row._count._all,
    from: row._min.dailyRateSelfDrive ?? 0,
  }));

  // The hero background is the flagship car's cover shot. Falls back to the
  // gradient ground when no vehicle has photos yet.
  const heroVehicle = vehicles.find((vehicle) => vehicle.photos.length > 0);
  const heroImage = heroVehicle?.photos[0];

  return (
    <>
      <section
        className={`relative isolate overflow-hidden border-b border-line ${heroImage ? "" : "hero-glow"}`}
      >
        {heroImage ? (
          <>
            <Image
              src={heroImage}
              alt={
                heroVehicle
                  ? `${heroVehicle.year} ${heroVehicle.make} ${heroVehicle.model}`
                  : "Featured vehicle"
              }
              fill
              priority
              sizes="100vw"
              unoptimized={isRemoteImage(heroImage)}
              className="-z-10 object-cover object-center"
            />
            {/* Scrim. On phones the copy spans the full width, so it needs a
                heavy vertical wash; on wide screens the copy sits left, so the
                horizontal pass carries it and the car stays visible on the right. */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-linear-to-b from-canvas/90 via-canvas/75 to-canvas
                         lg:from-canvas/80 lg:via-canvas/55"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 hidden bg-linear-to-r from-canvas via-canvas/70 to-transparent lg:block"
            />
            {heroVehicle ? (
              <Link
                href={`/vehicles/${heroVehicle.slug}`}
                className="absolute bottom-4 right-4 z-10 hidden rounded-full border border-line bg-canvas/70 px-3 py-1.5 text-xs text-muted backdrop-blur-sm transition-colors hover:text-ink lg:block"
              >
                Pictured: {heroVehicle.year} {heroVehicle.make} {heroVehicle.model} →
              </Link>
            ) : null}
          </>
        ) : null}

        <div className="container-page grid gap-10 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <p className="badge-brand">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              {config.businessName}
            </p>
            <h1 className="display mt-5">
              Drive it yourself,
              <br />
              <span className="text-muted">or let us drive.</span>
            </h1>
            <p className="lede mt-5">
              Book a self-drive rental online in a couple of minutes, or send us the details of your
              trip and we&apos;ll put a vetted chauffeur behind the wheel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/vehicles" className="btn-primary">
                Browse the fleet
              </Link>
              <Link href="/book/chauffeur" className="btn-secondary">
                Request a chauffeur
              </Link>
            </div>
            <div className="rule-accent mt-10" />
            <dl className="mt-6 grid grid-cols-2 gap-6 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted">Fleet</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">{fleetSize} vehicles</dd>
              </div>
              <div>
                <dt className="text-muted">Minimum hire</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {config.minRentalDays} day{config.minRentalDays === 1 ? "" : "s"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Deposit</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {config.selfDriveDepositPercent}%
                </dd>
              </div>
              <div>
                <dt className="text-muted">Free cancellation</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {config.cancellationWindowHours}h
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4">
            <div className="card p-5 shadow-(--shadow-lift)">
              <p className="eyebrow">Check dates</p>
              <p className="mt-1 mb-4 text-sm text-muted">
                Pick your window and we&apos;ll show only what&apos;s genuinely free.
              </p>
              <SearchWidget />
            </div>

            {[
              {
                title: "Self-drive",
                body: "Pick your dates, see a live price, pay the deposit and collect the keys. Availability is checked as you book.",
                href: "/vehicles",
                cta: "Check availability",
              },
              {
                title: "Chauffeur hire",
                body: "Tell us the pickup, drop-off and timings. We confirm the vehicle, driver and final price — usually within the hour.",
                href: "/book/chauffeur",
                cta: "Send trip details",
              },
            ].map((item) => (
              <div key={item.title} className="card-interactive group p-6">
                <h2 className="text-lg font-semibold tracking-tight">{item.title}</h2>
                <p className="mt-2 text-sm text-muted">{item.body}</p>
                <Link
                  href={item.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
                >
                  {item.cta}
                  <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page section">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="h-section">From the fleet</h2>
          <Link href="/vehicles" className="text-sm font-semibold text-accent">
            See all →
          </Link>
        </div>

        {vehicles.length === 0 ? (
          <p className="text-muted">The fleet is being set up. Please check back shortly.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} href={`/vehicles/${vehicle.slug}`} />
            ))}
          </div>
        )}
      </section>

      {/* Browse by make — the fleet's own manufacturers, not a fixed list. */}
      {makes.length > 1 ? (
        <section className="container-page section">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Browse by make</p>
              <h2 className="h-section mt-2">Know what you want?</h2>
            </div>
            <Link href="/vehicles" className="text-sm font-semibold text-accent">
              See the whole fleet →
            </Link>
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {makes.map((make) => (
              <li key={make.name}>
                <Link
                  href={`/vehicles?make=${encodeURIComponent(make.name)}`}
                  className="card-interactive flex h-full flex-col justify-between gap-3 p-4"
                >
                  <span className="font-semibold tracking-tight">{make.name}</span>
                  <span className="text-xs text-muted">
                    {make.count} {make.count === 1 ? "vehicle" : "vehicles"} · from{" "}
                    {formatMoney(make.from)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Why book with us */}
      <section className="border-y border-line bg-surface section">
        <div className="container-page">
          <p className="eyebrow">Why book with us</p>
          <h2 className="h-section mt-2">
            Booked online, confirmed properly.
          </h2>
          <p className="mt-2 max-w-prose text-muted">
            No phone tag to find out whether a car is free, and no double-booked weekend.
          </p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map(({ Icon, title, body }) => (
              <li key={title}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-accent ring-1 ring-brand/25 ring-inset">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works + what you'll need */}
      <section className="container-page section">
        <p className="eyebrow">How it works</p>
        <h2 className="h-section mt-2">
          Four steps from here to the keys.
        </h2>

        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative border-t border-line pt-5">
              {/* A short accent tick above each step reads as a numbered
                  sequence without shouting a giant numeral. */}
              <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-brand" />
              <span className="text-xs font-semibold tabular-nums tracking-[0.12em] text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div>
            <p className="eyebrow">Before you book</p>
            <h2 className="h-section mt-2">What you&apos;ll need</h2>
            <p className="mt-2 text-muted">
              Self-drive hires are checked at collection. Having these ready keeps the handover to a
              few minutes.
            </p>
            <Link href="/policies" className="mt-4 inline-block text-sm font-semibold text-accent">
              Read the full terms →
            </Link>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {REQUIREMENTS.map(({ Icon, title, body }) => (
              <li key={title} className="card flex gap-3 p-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="font-semibold tracking-tight">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Social proof lives on Instagram until there are photos on the site. */}
      {config.instagram ? (
        <section className="border-y border-line bg-surface">
          <div className="container-page flex flex-col items-start justify-between gap-4 py-10 sm:flex-row sm:items-center">
            <div>
              <p className="eyebrow">Follow along</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                See what people are driving
              </h2>
              <p className="mt-1 text-sm text-muted">
                The latest cars, trips and shoots go up on Instagram first.
              </p>
            </div>
            <a
              href={`https://instagram.com/${config.instagram.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              {config.instagram}
            </a>
          </div>
        </section>
      ) : null}

      {/* Closing CTA */}
      <section className="relative overflow-hidden border-y border-line bg-surface">
        <div className="container-page py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready when you are.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Check your dates against the live fleet, or send us a trip and we&apos;ll come back with
            a driver and a price.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/vehicles" className="btn-primary">
              Browse the fleet
            </Link>
            <Link
              href="/book/chauffeur"
              className="btn-secondary inline-flex"
            >
              Request a chauffeur
            </Link>
            {config.phone ? (
              <a
                href={`tel:${config.phone.replace(/[^\d+]/g, "")}`}
                className="btn-secondary inline-flex"
              >
                Call {config.phone}
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

const REASONS = [
  {
    Icon: CalendarCheckIcon,
    title: "Live availability",
    body: "The dates you see are the dates you can have. Every booking is checked against the fleet calendar as you make it.",
  },
  {
    Icon: TagIcon,
    title: "Clear pricing",
    body: "Daily rate, deposit and balance shown before you pay. Longer hires get the weekly and monthly rate automatically.",
  },
  {
    Icon: ShieldUserIcon,
    title: "Vetted drivers",
    body: "Chauffeur trips go out with a named, licensed driver — you get their details with your confirmation.",
  },
  {
    Icon: WrenchIcon,
    title: "Maintained between hires",
    body: "Every car is serviced and inspected on a schedule, and pulled from booking while it's in the shop.",
  },
  {
    Icon: PlaneIcon,
    title: "Airport and event ready",
    body: "Early starts, late finishes and waiting time handled — tell us the flight and we'll plan around it.",
  },
  {
    Icon: ChatIcon,
    title: "Real people on the other end",
    body: "Requests are confirmed by a person, usually within the hour during business hours.",
  },
] as const;

const STEPS = [
  { title: "Pick your dates", body: "Choose pickup and return, including times. We only show what's free." },
  { title: "Choose the car", body: "Filter by type, seats or price. Every listing shows the real daily rate." },
  { title: "Confirm and pay", body: "Enter your details and licence, pay the deposit, get an instant confirmation." },
  { title: "Collect the keys", body: "Bring your licence and card. We walk you round the car and you're away." },
] as const;

const REQUIREMENTS = [
  {
    Icon: LicenceIcon,
    title: "A valid driver's licence",
    body: "Held in the main driver's name and valid for the whole rental period.",
  },
  {
    Icon: CardIcon,
    title: "Photo ID and a payment card",
    body: "The card must be in the same name as the licence for the security hold.",
  },
  {
    Icon: ShieldUserIcon,
    title: "Insurance that covers you",
    body: "Standard cover is included; check the terms for the excess that applies.",
  },
  {
    Icon: KeyIcon,
    title: "Anyone else who'll drive",
    body: "Additional drivers must be named on the agreement before collection.",
  },
] as const;
