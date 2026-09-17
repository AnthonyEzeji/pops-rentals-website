import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { addDays, formatDate, startOfDay, toDateInputValue } from "@/lib/dates";
import { EmptyState, PageHeading, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reports" };

const DAY_MS = 86_400_000;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const params = await searchParams;

  const toParam = typeof params.to === "string" ? new Date(params.to) : new Date();
  const fromParam =
    typeof params.from === "string" ? new Date(params.from) : addDays(new Date(), -90);
  const to = Number.isNaN(toParam.getTime()) ? new Date() : startOfDay(addDays(toParam, 1));
  const from = Number.isNaN(fromParam.getTime())
    ? startOfDay(addDays(new Date(), -90))
    : startOfDay(fromParam);

  const periodDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));

  const [vehicles, reservations, expenses] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: [{ make: "asc" }, { model: "asc" }] }),
    prisma.reservation.findMany({
      where: { status: { not: "cancelled" }, startAt: { lt: to }, endAt: { gt: from } },
      include: { vehicle: true },
    }),
    prisma.expense.findMany({ where: { date: { gte: from, lt: to } }, include: { vehicle: true } }),
  ]);

  // Utilisation counts only the part of each booking that falls inside the
  // period, so a long hire spanning the boundary is not double-counted.
  const perVehicle = vehicles.map((vehicle) => {
    const own = reservations.filter((r) => r.vehicleId === vehicle.id);
    const bookedDays = own.reduce((total, reservation) => {
      const start = Math.max(reservation.startAt.getTime(), from.getTime());
      const end = Math.min(reservation.endAt.getTime(), to.getTime());
      return total + Math.max(0, (end - start) / DAY_MS);
    }, 0);

    const revenue = own.reduce((total, reservation) => total + reservation.amountPaid, 0);
    const spend = expenses
      .filter((expense) => expense.vehicleId === vehicle.id)
      .reduce((total, expense) => total + expense.amount, 0);

    return {
      vehicle,
      bookings: own.length,
      bookedDays,
      utilisation: Math.min(100, (bookedDays / periodDays) * 100),
      revenue,
      spend,
      net: revenue - spend,
    };
  });

  const totalRevenue = perVehicle.reduce((total, row) => total + row.revenue, 0);
  const totalSpend = expenses.reduce((total, expense) => total + expense.amount, 0);
  const generalSpend = expenses
    .filter((expense) => !expense.vehicleId)
    .reduce((total, expense) => total + expense.amount, 0);
  const averageUtilisation =
    perVehicle.length === 0
      ? 0
      : perVehicle.reduce((total, row) => total + row.utilisation, 0) / perVehicle.length;

  const byCategory = expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
    return acc;
  }, {});

  return (
    <>
      <PageHeading
        title="Reports"
        description={`${formatDate(from)} – ${formatDate(addDays(to, -1))} · ${periodDays} days`}
        action={
          <div className="flex gap-2">
            <a href="/api/admin/export/reservations" className="btn-secondary btn-sm">
              Reservations CSV
            </a>
            <a href="/api/admin/export/expenses" className="btn-secondary btn-sm">
              Expenses CSV
            </a>
          </div>
        }
      />

      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            className="input"
            defaultValue={toDateInputValue(from)}
          />
        </div>
        <div>
          <label className="label" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            className="input"
            defaultValue={toDateInputValue(addDays(to, -1))}
          />
        </div>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Collected" value={formatMoney(totalRevenue)} sub={`${reservations.length} bookings`} />
        <Stat
          label="Spent"
          value={formatMoney(totalSpend)}
          sub={`${formatMoney(generalSpend)} not vehicle-specific`}
        />
        <Stat
          label="Net"
          value={formatMoney(totalRevenue - totalSpend)}
          sub={totalRevenue >= totalSpend ? "In the black" : "In the red"}
        />
        <Stat
          label="Average utilisation"
          value={`${averageUtilisation.toFixed(0)}%`}
          sub="Share of days on hire"
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">By vehicle</h2>
        {perVehicle.length === 0 ? (
          <EmptyState title="No vehicles to report on" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th className="text-right">Bookings</th>
                  <th className="text-right">Days on hire</th>
                  <th>Utilisation</th>
                  <th className="text-right">Collected</th>
                  <th className="text-right">Spent</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {perVehicle.map((row) => (
                  <tr key={row.vehicle.id}>
                    <td>
                      <div className="font-medium">
                        {row.vehicle.make} {row.vehicle.model}
                      </div>
                      <div className="text-xs text-muted">{row.vehicle.plate}</div>
                    </td>
                    <td className="text-right tabular-nums">{row.bookings}</td>
                    <td className="text-right tabular-nums">{row.bookedDays.toFixed(1)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-24 overflow-hidden rounded-full bg-canvas"
                          role="img"
                          aria-label={`${row.utilisation.toFixed(0)} percent utilised`}
                        >
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${row.utilisation}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted">
                          {row.utilisation.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{formatMoney(row.revenue)}</td>
                    <td className="text-right tabular-nums">{formatMoney(row.spend)}</td>
                    <td
                      className={`text-right font-medium tabular-nums ${
                        row.net < 0 ? "text-red-700" : ""
                      }`}
                    >
                      {formatMoney(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Spend by category</h2>
        {Object.keys(byCategory).length === 0 ? (
          <EmptyState title="No expenses in this period" />
        ) : (
          <div className="card p-5">
            <ul className="space-y-3">
              {Object.entries(byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <li key={category} className="flex items-center gap-3 text-sm">
                    <span className="w-28 capitalize">{category}</span>
                    <div className="h-2 grow overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(amount / totalSpend) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 text-right tabular-nums">{formatMoney(amount)}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      <p className="hint mt-6">
        Revenue counts money actually received (deposits and balances recorded against a
        reservation), not the full contract value of future bookings.
      </p>
    </>
  );
}
