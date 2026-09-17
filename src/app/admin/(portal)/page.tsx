import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { addDays, formatDate, formatDateTime, startOfDay } from "@/lib/dates";
import { EmptyState, PageHeading, Stat, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  const weekEnd = addDays(todayStart, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    collectionsToday,
    returnsToday,
    upcoming,
    pendingRequests,
    fleetCount,
    onHire,
    inMaintenance,
    monthRevenue,
    monthExpenses,
    dueMaintenance,
    activeBlocks,
  ] = await Promise.all([
    prisma.reservation.findMany({
      where: { startAt: { gte: todayStart, lt: todayEnd }, status: { in: ["confirmed", "pending"] } },
      include: { vehicle: true, customer: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.reservation.findMany({
      where: { endAt: { gte: todayStart, lt: todayEnd }, status: { in: ["confirmed", "in_progress"] } },
      include: { vehicle: true, customer: true },
      orderBy: { endAt: "asc" },
    }),
    prisma.reservation.findMany({
      where: { startAt: { gte: todayEnd, lt: weekEnd }, status: { not: "cancelled" } },
      include: { vehicle: true, customer: true },
      orderBy: { startAt: "asc" },
      take: 10,
    }),
    prisma.reservation.count({ where: { type: "chauffeur", status: "pending" } }),
    prisma.vehicle.count(),
    prisma.reservation.count({ where: { status: "in_progress" } }),
    prisma.vehicle.count({ where: { status: { in: ["maintenance", "out_of_service"] } } }),
    prisma.reservation.aggregate({
      _sum: { amountPaid: true },
      where: { createdAt: { gte: monthStart }, status: { not: "cancelled" } },
    }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart } } }),
    prisma.maintenanceRecord.findMany({
      where: { nextDueDate: { lte: addDays(now, 30) } },
      include: { vehicle: true },
      orderBy: { nextDueDate: "asc" },
      take: 5,
    }),
    prisma.vehicleBlock.findMany({
      where: { endAt: { gte: now } },
      include: { vehicle: true },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
  ]);

  const revenue = monthRevenue._sum.amountPaid ?? 0;
  const expenses = monthExpenses._sum.amount ?? 0;

  return (
    <>
      <PageHeading
        title="Today"
        description={formatDate(now)}
        action={
          <div className="flex gap-2">
            <Link href="/admin/reservations/new" className="btn-primary btn-sm">
              New reservation
            </Link>
            <Link href="/admin/reservations?view=calendar" className="btn-secondary btn-sm">
              Calendar
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Collections today" value={String(collectionsToday.length)} />
        <Stat label="Returns today" value={String(returnsToday.length)} />
        <Stat
          label="Requests to confirm"
          value={String(pendingRequests)}
          sub={pendingRequests > 0 ? "Needs attention" : "All clear"}
        />
        <Stat
          label="Fleet"
          value={`${fleetCount - inMaintenance}/${fleetCount}`}
          sub={`${onHire} on hire · ${inMaintenance} off the road`}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Stat label="Collected this month" value={formatMoney(revenue)} />
        <Stat
          label="Spent this month"
          value={formatMoney(expenses)}
          sub={`Net ${formatMoney(revenue - expenses)}`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Out today</h2>
          {collectionsToday.length === 0 ? (
            <EmptyState title="No collections today" />
          ) : (
            <ul className="card divide-y divide-line">
              {collectionsToday.map((reservation) => (
                <ReservationRow key={reservation.id} reservation={reservation} at={reservation.startAt} />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Back today</h2>
          {returnsToday.length === 0 ? (
            <EmptyState title="No returns today" />
          ) : (
            <ul className="card divide-y divide-line">
              {returnsToday.map((reservation) => (
                <ReservationRow key={reservation.id} reservation={reservation} at={reservation.endAt} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Next seven days</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="Nothing booked in the next week" hint="Time to chase some business." />
        ) : (
          <ul className="card divide-y divide-line">
            {upcoming.map((reservation) => (
              <ReservationRow key={reservation.id} reservation={reservation} at={reservation.startAt} />
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Vehicles needing attention</h2>
          {dueMaintenance.length === 0 && activeBlocks.length === 0 ? (
            <EmptyState title="Nothing due" hint="No service due in the next 30 days." />
          ) : (
            <ul className="card divide-y divide-line text-sm">
              {dueMaintenance.map((record) => (
                <li key={record.id} className="flex items-center justify-between gap-3 p-4">
                  <span>
                    <strong>
                      {record.vehicle.make} {record.vehicle.model}
                    </strong>
                    <span className="text-muted"> · {record.type} due</span>
                  </span>
                  <span className="text-muted">
                    {record.nextDueDate ? formatDate(record.nextDueDate) : "—"}
                  </span>
                </li>
              ))}
              {activeBlocks.map((block) => (
                <li key={block.id} className="flex items-center justify-between gap-3 p-4">
                  <span>
                    <strong>
                      {block.vehicle.make} {block.vehicle.model}
                    </strong>
                    <span className="text-muted"> · {block.reason.replace("_", " ")}</span>
                  </span>
                  <span className="text-muted">
                    {formatDate(block.startAt)} – {formatDate(block.endAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Shortcuts</h2>
          <div className="card grid gap-2 p-4 text-sm">
            <Link href="/admin/requests" className="rounded-lg px-3 py-2 hover:bg-canvas">
              Confirm chauffeur requests {pendingRequests > 0 ? `(${pendingRequests})` : ""}
            </Link>
            <Link href="/admin/maintenance" className="rounded-lg px-3 py-2 hover:bg-canvas">
              Log maintenance or block dates
            </Link>
            <Link href="/admin/expenses" className="rounded-lg px-3 py-2 hover:bg-canvas">
              Record an expense
            </Link>
            <Link href="/admin/vehicles/new" className="rounded-lg px-3 py-2 hover:bg-canvas">
              Add a vehicle
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

type RowReservation = {
  id: string;
  reference: string;
  status: string;
  type: string;
  vehicle: { make: string; model: string; plate: string };
  customer: { name: string; phone: string };
};

function ReservationRow({ reservation, at }: { reservation: RowReservation; at: Date }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <div>
        <Link href={`/admin/reservations/${reservation.id}`} className="font-medium hover:underline">
          {reservation.customer.name}
        </Link>
        <p className="text-muted">
          {reservation.vehicle.make} {reservation.vehicle.model} · {reservation.vehicle.plate} ·{" "}
          {reservation.customer.phone}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-muted">{formatDateTime(at)}</span>
        <StatusBadge status={reservation.status} />
      </div>
    </li>
  );
}
