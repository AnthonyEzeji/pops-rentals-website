import Image from "next/image";
import Link from "next/link";
import type { Vehicle } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { humanize } from "@/components/ui";
import { isRemoteImage } from "@/lib/images";

export function VehicleCard({
  vehicle,
  href,
  bookHref,
  unavailable = false,
}: {
  vehicle: Vehicle;
  href: string;
  /** Set when dates are known, so "Book" can skip straight to checkout. */
  bookHref?: string;
  unavailable?: boolean;
}) {
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  // Headline specs, in the order rental listings normally read them.
  const specs = [
    vehicle.engine,
    vehicle.horsepower ? `${vehicle.horsepower} hp` : null,
    vehicle.zeroToSixty ? `0–60 in ${vehicle.zeroToSixty}s` : null,
  ].filter(Boolean) as string[];

  return (
    <article className={`card-interactive group overflow-hidden ${unavailable ? "opacity-60" : ""}`}>
      <Link href={href} className="block" tabIndex={-1} aria-hidden>
        {/* 4:3 rather than 16:10 — the photos come off Instagram square, and a
            wider crop cuts the roofline and wheels off. */}
        <div className="relative aspect-4/3 overflow-hidden bg-canvas">
          {vehicle.photos[0] ? (
            <Image
              src={vehicle.photos[0]}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized={isRemoteImage(vehicle.photos[0])}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            // Photos are added per car in the admin; until then show a branded
            // placeholder rather than an empty box or a stock shot of the model.
            <div className="grid h-full place-items-center bg-raised">
              <span className="text-center">
                <span className="block text-2xl font-semibold tracking-tight text-brand">
                  {vehicle.make}
                </span>
                <span className="mt-1 block text-xs uppercase tracking-[0.2em] text-muted">
                  {vehicle.model}
                </span>
              </span>
            </div>
          )}

          <span className="badge absolute left-3 top-3 bg-canvas/80 text-brand ring-1 ring-brand/30 ring-inset backdrop-blur-sm">
            {humanize(vehicle.category)}
          </span>

          {unavailable ? (
            <span className="badge absolute right-3 top-3 bg-warn-soft text-warn ring-1 ring-warn/30 ring-inset backdrop-blur-sm">Booked</span>
          ) : vehicle.chauffeurHourlyRate || vehicle.chauffeurDayRate ? (
            <span className="badge absolute right-3 top-3 bg-canvas/85 text-ink ring-1 ring-line ring-inset backdrop-blur-sm">
              Chauffeur available
            </span>
          ) : null}
        </div>
      </Link>

      <div className="p-4">
        <h3 className="font-semibold tracking-tight">
          <Link href={href} className="hover:text-accent">
            {name}
          </Link>
        </h3>

        {specs.length > 0 ? (
          <p className="mt-1 text-sm text-muted">{specs.join(" · ")}</p>
        ) : null}

        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {[
            `${vehicle.seats} seats`,
            humanize(vehicle.transmission),
            humanize(vehicle.fuelType),
          ].map((spec) => (
            <li
              key={spec}
              className="rounded-md bg-canvas px-2 py-1 text-xs font-medium text-muted ring-1 ring-line ring-inset"
            >
              {spec}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-4">
          <p className="text-sm">
            <span className="block text-xs text-muted">Starting at</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatMoney(vehicle.dailyRateSelfDrive)}
            </span>
            <span className="text-muted"> / day</span>
          </p>

          <div className="flex gap-2">
            <Link href={href} className="btn-secondary btn-sm">
              Details
            </Link>
            {!unavailable ? (
              <Link href={bookHref ?? href} className="btn-primary btn-sm">
                Book
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
