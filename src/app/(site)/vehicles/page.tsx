import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { availableVehicleIds } from "@/lib/availability";
import { VehicleCard } from "@/components/vehicle-card";
import { PageHeading } from "@/components/ui";
import { SearchWidget } from "@/components/search-widget";
import { FilterChips, InventoryFilters } from "./filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fleet",
  description: "Browse available vehicles, filter by type, seats, transmission and price.",
};

const SORTS = {
  price_asc: { dailyRateSelfDrive: "asc" },
  price_desc: { dailyRateSelfDrive: "desc" },
  seats_desc: { seats: "desc" },
  newest: { year: "desc" },
} as const satisfies Record<string, Prisma.VehicleOrderByWithRelationInput>;

type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const category = one(params, "category");
  const make = one(params, "make");
  const transmission = one(params, "transmission");
  const seats = Number(one(params, "seats"));
  const maxPrice = Number(one(params, "maxPrice"));
  const sort = (one(params, "sort") ?? "price_asc") as keyof typeof SORTS;
  const start = one(params, "start");
  const end = one(params, "end");
  const startHour = one(params, "startHour") ?? "9";
  const endHour = one(params, "endHour") ?? "9";

  const where: Prisma.VehicleWhereInput = {
    status: { not: "out_of_service" },
    ...(category ? { category: category as Prisma.EnumVehicleCategoryFilter["equals"] } : {}),
    ...(make ? { make: { equals: make, mode: "insensitive" } } : {}),
    ...(transmission
      ? { transmission: transmission as Prisma.EnumTransmissionFilter["equals"] }
      : {}),
    ...(Number.isFinite(seats) && seats > 0 ? { seats: { gte: seats } } : {}),
    ...(Number.isFinite(maxPrice) && maxPrice > 0
      ? { dailyRateSelfDrive: { lte: Math.round(maxPrice * 100) } }
      : {}),
  };

  const [vehicles, fleet] = await Promise.all([
    prisma.vehicle.findMany({ where, orderBy: SORTS[sort] ?? SORTS.price_asc }),
    prisma.vehicle.findMany({
      where: { status: { not: "out_of_service" } },
      select: { make: true },
      distinct: ["make"],
      orderBy: { make: "asc" },
    }),
  ]);

  // When the visitor gave dates, split the grid into what they can actually book.
  // Times come from the hour selects on the search widget (service hours 9–21).
  let availableIds: Set<string> | null = null;
  let rangeError: string | null = null;
  if (start && end) {
    const startAt = new Date(`${start}T${String(startHour).padStart(2, "0")}:00`);
    const endAt = new Date(`${end}T${String(endHour).padStart(2, "0")}:00`);
    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      endAt <= startAt
    ) {
      rangeError = "Enter a return date that is after the pickup date.";
    } else {
      availableIds = await availableVehicleIds(startAt, endAt);
    }
  }

  const bookable = availableIds ? vehicles.filter((v) => availableIds.has(v.id)) : vehicles;
  const unavailable = availableIds ? vehicles.filter((v) => !availableIds.has(v.id)) : [];

  const detailHref = (slug: string) =>
    start && end && !rangeError
      ? `/vehicles/${slug}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}` +
        `&startHour=${startHour}&endHour=${endHour}`
      : `/vehicles/${slug}`;

  const shared = {
    start,
    end,
    startHour,
    endHour,
    category,
    make,
    transmission,
    seats: one(params, "seats"),
    maxPrice: one(params, "maxPrice"),
    sort,
  };

  return (
    <div className="container-page py-10">
      <PageHeading
        title="The fleet"
        description="Filter by what you need, then check your dates. Prices are per day for self-drive."
      />

      <div className="card mb-6 p-4">
        <SearchWidget defaults={{ start, end, startHour, endHour }} compact />
      </div>

      <FilterChips makes={fleet.map((vehicle) => vehicle.make)} values={shared} />

      <InventoryFilters values={shared} />

      {rangeError ? <p className="error mb-4 text-sm">{rangeError}</p> : null}

      <p className="mb-4 text-sm text-muted" aria-live="polite">
        {bookable.length} vehicle{bookable.length === 1 ? "" : "s"}
        {availableIds ? " available for your dates" : " in the fleet"}
        {unavailable.length > 0 ? ` · ${unavailable.length} booked` : ""}
      </p>

      {bookable.length === 0 && unavailable.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium">Nothing matches those filters.</p>
          <p className="mt-1 text-sm text-muted">Try widening the price range or seat count.</p>
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bookable.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            href={detailHref(vehicle.slug)}
            bookHref={
              start && end && !rangeError
                ? `/book/self-drive?vehicle=${vehicle.slug}&start=${start}&end=${end}&startHour=${startHour}&endHour=${endHour}`
                : undefined
            }
          />
        ))}
      </div>

      {unavailable.length > 0 ? (
        <>
          <h2 className="mb-4 mt-12 text-lg font-semibold">Booked for your dates</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {unavailable.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                href={`/vehicles/${vehicle.slug}`}
                unavailable
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
