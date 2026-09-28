import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { addDays, formatDate, parseBusinessDateTime, toDateInputValue } from "@/lib/dates";
import { findConflict, quoteSelfDrive, vehicleBusyWindows } from "@/lib/availability";
import { humanize } from "@/components/ui";
import { isRemoteImage } from "@/lib/images";
import { VehicleCard } from "@/components/vehicle-card";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { slug } });
  if (!vehicle) return { title: "Vehicle not found" };
  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    description: vehicle.description.slice(0, 160),
  };
}

function one(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function VehicleDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const vehicle = await prisma.vehicle.findUnique({ where: { slug } });
  if (!vehicle) notFound();

  const start = one(query, "start");
  const end = one(query, "end");
  // Times come from the search widget's hour selects; 9am is the default.
  const startHour = one(query, "startHour") ?? "9";
  const endHour = one(query, "endHour") ?? "9";
  const pad = (hour: string) => String(hour).padStart(2, "0");
  const startAt = start ? parseBusinessDateTime(`${start}T${pad(startHour)}:00`) : null;
  const endAt = end ? parseBusinessDateTime(`${end}T${pad(endHour)}:00`) : null;
  const hasRange =
    startAt && endAt && !Number.isNaN(startAt.getTime()) && !Number.isNaN(endAt.getTime()) && endAt > startAt;

  const quote = hasRange ? quoteSelfDrive(vehicle, startAt, endAt) : null;
  const conflict = hasRange ? await findConflict(prisma, vehicle.id, startAt, endAt) : null;

  const busy = await vehicleBusyWindows(vehicle.id, new Date(), addDays(new Date(), 120));
  const chauffeurCapable = vehicle.chauffeurHourlyRate !== null || vehicle.chauffeurDayRate !== null;

  const specs: Array<[string, string]> = [
    ["Category", humanize(vehicle.category)],
    ["Seats", String(vehicle.seats)],
    ["Transmission", humanize(vehicle.transmission)],
    ["Fuel", humanize(vehicle.fuelType)],
    ["Year", String(vehicle.year)],
    ...(vehicle.engine ? ([["Engine", vehicle.engine]] as Array<[string, string]>) : []),
    ...(vehicle.horsepower
      ? ([["Power", `${vehicle.horsepower} hp`]] as Array<[string, string]>)
      : []),
    ...(vehicle.zeroToSixty
      ? ([["0–60 mph", `${vehicle.zeroToSixty} sec`]] as Array<[string, string]>)
      : []),
    ...(vehicle.topSpeed
      ? ([["Top speed", `${vehicle.topSpeed} mph`]] as Array<[string, string]>)
      : []),
  ];

  // Same body type, similar money — shown at the foot of the page.
  const related = await prisma.vehicle.findMany({
    where: {
      id: { not: vehicle.id },
      status: { not: "out_of_service" },
      category: vehicle.category,
    },
    orderBy: { dailyRateSelfDrive: "asc" },
    take: 3,
  });

  return (
    <div className="container-page py-10">
      <Link href="/vehicles" className="text-sm font-semibold text-accent">
        ← Back to the fleet
      </Link>

      <div className="mt-4 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="relative aspect-3/2 overflow-hidden rounded-2xl border border-line bg-surface">
            {vehicle.photos[0] ? (
              <Image
                src={vehicle.photos[0]}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                unoptimized={isRemoteImage(vehicle.photos[0])}
                className="object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center bg-raised text-center">
                <span>
                  <span className="block text-4xl font-semibold tracking-tight text-brand">
                    {vehicle.make}
                  </span>
                  <span className="mt-2 block text-sm uppercase tracking-[0.25em] text-muted">
                    {vehicle.model}
                  </span>
                  <span className="mt-4 block text-xs text-muted/70">Photos coming soon</span>
                </span>
              </div>
            )}
          </div>

          {vehicle.photos.length > 1 ? (
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {vehicle.photos.slice(1).map((photo, index) => (
                <div
                  key={photo}
                  className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface"
                >
                  <Image
                    src={photo}
                    alt={`${vehicle.make} ${vehicle.model} photo ${index + 2}`}
                    fill
                    sizes="(max-width: 640px) 33vw, 20vw"
                    unoptimized={isRemoteImage(photo)}
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{humanize(vehicle.category)}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
            </div>
            {vehicle.horsepower || vehicle.engine ? (
              <p className="badge-brand">
                {[vehicle.engine, vehicle.horsepower ? `${vehicle.horsepower} hp` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          <p className="mt-3 max-w-prose text-muted">{vehicle.description}</p>

          <h2 className="mt-8 text-lg font-semibold">Specification</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {specs.map(([label, value]) => (
              <div key={label} className="border-b border-line pb-2">
                <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {vehicle.features.length > 0 ? (
            <>
              <h2 className="mt-8 text-lg font-semibold">Features</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {vehicle.features.map((feature) => (
                  <li key={feature} className="badge border border-line bg-surface text-ink">
                    {feature}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className="mt-8 text-lg font-semibold">Already booked</h2>
          {busy.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing booked in the next four months.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {busy.slice(0, 8).map((window, index) => (
                <li key={index}>
                  {formatDate(window.startAt)} – {formatDate(window.endAt)}
                  {window.kind === "block" ? " · maintenance" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6 shadow-(--shadow-lift)">
            <p className="text-sm text-muted">Self-drive from</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatMoney(vehicle.dailyRateSelfDrive)}
              <span className="text-base font-normal text-muted"> / day</span>
            </p>
            {config.weeklyDiscountPercent > 0 ? (
              <p className="hint">
                {config.weeklyDiscountPercent}% off from 7 days ·{" "}
                {config.monthlyDiscountPercent}% from 28
              </p>
            ) : null}

            <form method="get" className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="start">
                  Pickup date
                </label>
                <input
                  id="start"
                  name="start"
                  type="date"
                  required
                  className="input"
                  min={toDateInputValue(new Date())}
                  defaultValue={start ?? ""}
                />
              </div>
              <div>
                <label className="label" htmlFor="end">
                  Return date
                </label>
                <input
                  id="end"
                  name="end"
                  type="date"
                  required
                  className="input"
                  min={toDateInputValue(addDays(new Date(), config.minRentalDays))}
                  defaultValue={end ?? ""}
                />
              </div>
              <button type="submit" className="btn-secondary w-full">
                Check availability
              </button>
            </form>

            {hasRange ? (
              <div className="mt-6 border-t border-line pt-6">
                {conflict ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {conflict.detail}
                  </div>
                ) : (
                  <>
                    <p className="mb-3 flex items-center gap-2 text-sm font-medium text-accent">
                      <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
                      Available for these dates
                    </p>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted">Daily rate</dt>
                        <dd className="tabular-nums">
                          {formatMoney(vehicle.dailyRateSelfDrive)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Days</dt>
                        <dd className="tabular-nums">{quote!.days}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Subtotal</dt>
                        <dd className="font-medium tabular-nums">{formatMoney(quote!.subtotal)}</dd>
                      </div>
                      {quote!.discount > 0 ? (
                        <div className="flex justify-between text-accent">
                          <dt>{quote!.discountLabel}</dt>
                          <dd className="font-semibold">−{formatMoney(quote!.discount)}</dd>
                        </div>
                      ) : null}
                      <div className="flex justify-between border-t border-line pt-2">
                        <dt className="font-medium">Total</dt>
                        <dd className="font-semibold">{formatMoney(quote!.total)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">
                          Due now{quote!.deposit > 0 ? ` (${config.selfDriveDepositPercent}%)` : ""}
                        </dt>
                        <dd className="font-medium">{formatMoney(quote!.deposit)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Rental balance</dt>
                        <dd className="font-medium tabular-nums">
                          {formatMoney(quote!.balanceDue)}
                        </dd>
                      </div>
                      {quote!.securityDeposit > 0 ? (
                        <div className="flex justify-between">
                          <dt className="text-muted">Refundable security deposit</dt>
                          <dd className="font-medium tabular-nums">
                            {formatMoney(quote!.securityDeposit)}
                          </dd>
                        </div>
                      ) : null}
                      {/* The figure that matters: everything handed over on the
                          day, deposit included. Same total as the checkout. */}
                      <div className="flex justify-between border-t border-line pt-2">
                        <dt className="font-medium">Due at collection</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatMoney(quote!.dueAtCollection)}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      href={`/book/self-drive?vehicle=${vehicle.slug}&start=${start}&end=${end}&startHour=${startHour}&endHour=${endHour}`}
                      className="btn-primary mt-5 w-full"
                    >
                      Continue to booking
                    </Link>
                    <p className="hint text-center">
                      Free cancellation for {config.cancellationWindowHours}h
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="hint mt-4">
                Minimum hire {config.minRentalDays} day{config.minRentalDays === 1 ? "" : "s"}. Free
                cancellation up to {config.cancellationWindowHours} hours before pickup.
              </p>
            )}

            {chauffeurCapable ? (
              <div className="mt-6 border-t border-line pt-6">
                <p className="text-sm font-medium">Prefer to be driven?</p>
                <p className="mt-1 text-sm text-muted">
                  {vehicle.chauffeurHourlyRate
                    ? `Chauffeur hire from ${formatMoney(vehicle.chauffeurHourlyRate)} per hour.`
                    : `Chauffeur hire from ${formatMoney(vehicle.chauffeurDayRate!)} per day.`}
                </p>
                <Link
                  href={`/book/chauffeur?vehicle=${vehicle.slug}`}
                  className="btn-secondary mt-3 w-full"
                >
                  Request a chauffeur
                </Link>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-16 border-t border-line pt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Similar</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Others in this class
              </h2>
            </div>
            <Link href="/vehicles" className="text-sm font-semibold text-accent">
              See the whole fleet →
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other) => (
              <VehicleCard
                key={other.id}
                vehicle={other}
                href={
                  start && end
                    ? `/vehicles/${other.slug}?start=${start}&end=${end}&startHour=${startHour}&endHour=${endHour}`
                    : `/vehicles/${other.slug}`
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
