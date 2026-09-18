import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { addDays, formatDateTime, startOfDay, toDateInputValue } from "@/lib/dates";
import { EmptyState, PageHeading, StatusBadge } from "@/components/ui";
import { FleetCalendar } from "./calendar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reservations" };

type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const view = one(params, "view") === "calendar" ? "calendar" : "list";
  const status = one(params, "status");
  const type = one(params, "type");
  const query = one(params, "q")?.trim();
  const from = one(params, "from");

  const fromDate = from ? new Date(from) : new Date();
  const anchor = Number.isNaN(fromDate.getTime()) ? new Date() : fromDate;

  if (view === "calendar") {
    const windowStart = startOfDay(anchor);
    const windowEnd = addDays(windowStart, 14);

    const vehicles = await prisma.vehicle.findMany({
      orderBy: [{ status: "asc" }, { make: "asc" }],
      include: {
        reservations: {
          where: {
            status: { not: "cancelled" },
            startAt: { lt: windowEnd },
            endAt: { gt: windowStart },
          },
          include: { customer: true },
        },
        blocks: { where: { startAt: { lt: windowEnd }, endAt: { gt: windowStart } } },
      },
    });

    const rows = vehicles.map((vehicle) => ({
      vehicle,
      bars: [
        ...vehicle.reservations.map((reservation) => ({
          id: reservation.id,
          label: `${reservation.customer.name} (${reservation.reference})`,
          href: `/admin/reservations/${reservation.id}`,
          startAt: reservation.startAt,
          endAt: reservation.endAt,
          tone: (reservation.status === "pending" ? "pending" : "booked") as "pending" | "booked",
        })),
        ...vehicle.blocks.map((block) => ({
          id: block.id,
          label: block.note || block.reason.replace("_", " "),
          startAt: block.startAt,
          endAt: block.endAt,
          tone: "block" as const,
        })),
      ],
    }));

    return (
      <>
        <PageHeading
          title="Calendar"
          description="Fourteen days across the whole fleet. Click a booking to open it."
          action={<ViewSwitch view={view} />}
        />

        <div className="mb-4 flex flex-wrap items-end gap-3">
          {/* Paging first, so the arrows never get squeezed against the picker. */}
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/reservations?view=calendar&from=${toDateInputValue(addDays(anchor, -14))}`}
              className="btn-secondary w-11 px-0"
              aria-label="Previous two weeks"
              title="Previous two weeks"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                <path d="M12.5 3.8 6.3 10l6.2 6.2 1.2-1.2L8.7 10l5-5-1.2-1.2Z" />
              </svg>
            </Link>
            <Link
              href={`/admin/reservations?view=calendar&from=${toDateInputValue(addDays(anchor, 14))}`}
              className="btn-secondary w-11 px-0"
              aria-label="Next two weeks"
              title="Next two weeks"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                <path d="M7.5 3.8 6.3 5l5 5-5 5 1.2 1.2L13.7 10 7.5 3.8Z" />
              </svg>
            </Link>
            <Link href="/admin/reservations?view=calendar" className="btn-secondary">
              Today
            </Link>
          </div>

          <form method="get" className="flex flex-1 items-end gap-2 sm:flex-none">
            <input type="hidden" name="view" value="calendar" />
            <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
              <label className="label" htmlFor="from">
                Jump to
              </label>
              <input
                id="from"
                name="from"
                type="date"
                className="input"
                defaultValue={toDateInputValue(anchor)}
              />
            </div>
            <button type="submit" className="btn-secondary shrink-0">
              Go
            </button>
          </form>
        </div>

        <FleetCalendar rows={rows} from={anchor} />
      </>
    );
  }

  const where: Prisma.ReservationWhereInput = {
    ...(status ? { status: status as Prisma.EnumReservationStatusFilter["equals"] } : {}),
    ...(type ? { type: type as Prisma.EnumReservationTypeFilter["equals"] } : {}),
    ...(query
      ? {
          OR: [
            { reference: { contains: query, mode: "insensitive" } },
            { customer: { name: { contains: query, mode: "insensitive" } } },
            { customer: { email: { contains: query, mode: "insensitive" } } },
            { vehicle: { plate: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const reservations = await prisma.reservation.findMany({
    where,
    include: { vehicle: true, customer: true, chauffeurTrip: { include: { driver: true } } },
    orderBy: { startAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeading
        title="Reservations"
        description="Every self-drive booking and chauffeur trip."
        action={
          <div className="flex gap-2">
            <ViewSwitch view={view} />
            <Link href="/admin/reservations/new" className="btn-primary btn-sm">
              New
            </Link>
          </div>
        }
      />

      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="grow">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            className="input"
            placeholder="Reference, customer, email or plate"
            defaultValue={query ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="input" defaultValue={status ?? ""}>
            <option value="">Any</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="type">
            Type
          </label>
          <select id="type" name="type" className="input" defaultValue={type ?? ""}>
            <option value="">Any</option>
            <option value="self_drive">Self-drive</option>
            <option value="chauffeur">Chauffeur</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Filter
        </button>
        <Link href="/admin/reservations" className="btn-secondary">
          Reset
        </Link>
      </form>

      {reservations.length === 0 ? (
        <EmptyState title="No reservations match" hint="Try clearing the filters." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Dates</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td>
                    <Link
                      href={`/admin/reservations/${reservation.id}`}
                      className="font-mono font-medium text-accent hover:underline"
                    >
                      {reservation.reference}
                    </Link>
                  </td>
                  <td>
                    <div className="font-medium">{reservation.customer.name}</div>
                    <div className="text-xs text-muted">{reservation.customer.phone}</div>
                  </td>
                  <td>
                    <div>
                      {reservation.vehicle.make} {reservation.vehicle.model}
                    </div>
                    <div className="text-xs text-muted">{reservation.vehicle.plate}</div>
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    <div>{formatDateTime(reservation.startAt)}</div>
                    <div className="text-muted">{formatDateTime(reservation.endAt)}</div>
                  </td>
                  <td className="text-xs">
                    {reservation.type === "chauffeur" ? (
                      <>
                        Chauffeur
                        <div className="text-muted">
                          {reservation.chauffeurTrip?.driver?.name ?? "No driver"}
                        </div>
                      </>
                    ) : (
                      "Self-drive"
                    )}
                  </td>
                  <td>
                    <StatusBadge status={reservation.status} />
                  </td>
                  <td className="text-right tabular-nums">
                    <div>{formatMoney(reservation.priceTotal, reservation.currency)}</div>
                    <div className="text-xs text-muted">
                      {formatMoney(reservation.amountPaid, reservation.currency)} paid
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ViewSwitch({ view }: { view: string }) {
  return (
    <div className="flex rounded-lg border border-line bg-surface p-0.5 text-sm">
      <Link
        href="/admin/reservations"
        className={`rounded-md px-3 py-1.5 ${view === "list" ? "bg-brand text-brand-ink" : "text-muted"}`}
      >
        List
      </Link>
      <Link
        href="/admin/reservations?view=calendar"
        className={`rounded-md px-3 py-1.5 ${
          view === "calendar" ? "bg-brand text-brand-ink" : "text-muted"
        }`}
      >
        Calendar
      </Link>
    </div>
  );
}
