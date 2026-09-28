import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { EmptyState, PageHeading } from "@/components/ui";
import { CustomerForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const where: Prisma.CustomerWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { licenseNumber: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    take: 200,
    include: {
      reservations: {
        where: { status: { not: "cancelled" } },
        select: { id: true, amountPaid: true, startAt: true },
      },
    },
  });

  return (
    <>
      <PageHeading
        title="Customers"
        description="Everyone who has booked, plus anyone you add ahead of time. Saved details fill themselves in on a new reservation."
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div>
          <form method="get" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
            <div className="grow">
              <label className="label" htmlFor="q">
                Search
              </label>
              <input
                id="q"
                name="q"
                className="input"
                placeholder="Name, email, phone or licence"
                defaultValue={query}
              />
            </div>
            <button type="submit" className="btn-secondary">
              Search
            </button>
            {query ? (
              <Link href="/admin/customers" className="btn-secondary">
                Clear
              </Link>
            ) : null}
          </form>

          {customers.length === 0 ? (
            <EmptyState
              title={query ? "Nobody matches that search" : "No customers yet"}
              hint={
                query
                  ? "Try part of a name, email or phone number."
                  : "Customers are added automatically when someone books, or you can add one now."
              }
            />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Licence</th>
                    <th className="text-right">Hires</th>
                    <th className="text-right">Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const spent = customer.reservations.reduce((sum, r) => sum + r.amountPaid, 0);
                    const last = customer.reservations
                      .map((r) => r.startAt)
                      .sort((a, b) => b.getTime() - a.getTime())[0];

                    return (
                      <tr key={customer.id}>
                        <td>
                          <Link
                            href={`/admin/customers/${customer.id}`}
                            className="font-medium text-accent hover:underline"
                          >
                            {customer.name}
                          </Link>
                          {last ? (
                            <div className="text-xs text-muted">Last hire {formatDate(last)}</div>
                          ) : null}
                        </td>
                        <td className="text-xs wrap-break-word">
                          <div>{customer.phone}</div>
                          <div className="text-muted">{customer.email}</div>
                        </td>
                        <td className="text-xs">
                          {customer.licenseNumber ?? <span className="text-muted">—</span>}
                          {customer.licenseExpiry ? (
                            <div className="text-muted">
                              exp {formatDate(customer.licenseExpiry)}
                            </div>
                          ) : null}
                        </td>
                        <td className="text-right tabular-nums">{customer.reservations.length}</td>
                        <td className="text-right tabular-nums">{formatMoney(spent)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside>
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Add a customer</h2>
            <p className="mb-4 text-sm text-muted">
              Save a repeat client now and their details will fill in automatically next time you
              make a reservation.
            </p>
            <CustomerForm />
          </section>
        </aside>
      </div>
    </>
  );
}
