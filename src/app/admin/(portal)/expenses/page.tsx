import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { EmptyState, PageHeading, Stat, humanize } from "@/components/ui";
import { deleteExpense } from "../actions";
import { ExpenseForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Expenses feed the P&L, so they are owner-only (PRD A12).
  await requireOwner();

  const params = await searchParams;
  const vehicleFilter = typeof params.vehicleId === "string" ? params.vehicleId : "";
  const categoryFilter = typeof params.category === "string" ? params.category : "";

  const where: Prisma.ExpenseWhereInput = {
    ...(vehicleFilter ? { vehicleId: vehicleFilter } : {}),
    ...(categoryFilter
      ? { category: categoryFilter as Prisma.EnumExpenseCategoryFilter["equals"] }
      : {}),
  };

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [vehicles, expenses, monthTotal, yearTotal] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: [{ make: "asc" }, { model: "asc" }] }),
    prisma.expense.findMany({
      where,
      include: { vehicle: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart } } }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: new Date(new Date().getFullYear(), 0, 1) } },
    }),
  ]);

  return (
    <>
      <PageHeading title="Expenses" description="Fuel, repairs, insurance and everything else." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label="This month" value={formatMoney(monthTotal._sum.amount ?? 0)} />
        <Stat label="This year" value={formatMoney(yearTotal._sum.amount ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <form method="get" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
            <div className="grow">
              <label className="label" htmlFor="vehicleId">
                Vehicle
              </label>
              <select id="vehicleId" name="vehicleId" className="input" defaultValue={vehicleFilter}>
                <option value="">All vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} · {vehicle.plate}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="category">
                Category
              </label>
              <select id="category" name="category" className="input" defaultValue={categoryFilter}>
                <option value="">All</option>
                <option value="fuel">Fuel</option>
                <option value="repair">Repair</option>
                <option value="insurance">Insurance</option>
                <option value="registration">Registration</option>
                <option value="cleaning">Cleaning</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button type="submit" className="btn-secondary">
              Filter
            </button>
          </form>

          {expenses.length === 0 ? (
            <EmptyState title="No expenses recorded" hint="Add the first one on the right." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Category</th>
                    <th>Vendor</th>
                    <th className="text-right">Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="whitespace-nowrap">{formatDate(expense.date)}</td>
                      <td>
                        {expense.vehicle ? (
                          <>
                            {expense.vehicle.make} {expense.vehicle.model}
                            <div className="text-xs text-muted">{expense.vehicle.plate}</div>
                          </>
                        ) : (
                          <span className="text-muted">General</span>
                        )}
                      </td>
                      <td>{humanize(expense.category)}</td>
                      <td className="text-xs">
                        {expense.vendor || "—"}
                        {expense.notes ? <div className="text-muted">{expense.notes}</div> : null}
                        {expense.receiptUrl ? (
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline"
                          >
                            Receipt
                          </a>
                        ) : null}
                      </td>
                      <td className="text-right tabular-nums">{formatMoney(expense.amount)}</td>
                      <td className="text-right">
                        <form action={deleteExpense}>
                          <input type="hidden" name="id" value={expense.id} />
                          <button type="submit" className="btn-danger btn-sm">
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside>
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Record an expense</h2>
            <ExpenseForm
              vehicles={vehicles.map((vehicle) => ({
                id: vehicle.id,
                label: `${vehicle.make} ${vehicle.model} · ${vehicle.plate}`,
              }))}
            />
          </section>
        </aside>
      </div>
    </>
  );
}
