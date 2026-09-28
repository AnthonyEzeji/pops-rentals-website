import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime, toDateInputValue } from "@/lib/dates";
import { EmptyState, PageHeading, StatusBadge } from "@/components/ui";
import { CustomerForm } from "../form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      reservations: {
        include: { vehicle: true },
        orderBy: { startAt: "desc" },
      },
    },
  });
  if (!customer) notFound();

  const spent = customer.reservations
    .filter((r) => r.status !== "cancelled")
    .reduce((sum, r) => sum + r.amountPaid, 0);

  const licenceExpired =
    customer.licenseExpiry && customer.licenseExpiry.getTime() < Date.now();

  return (
    <>
      <Link href="/admin/customers" className="text-sm font-semibold text-accent">
        ← All customers
      </Link>

      <div className="mt-4">
        <PageHeading
          title={customer.name}
          description={`Customer since ${formatDate(customer.createdAt)} · ${formatMoney(spent)} collected`}
          action={
            <Link
              href={`/admin/reservations/new?customer=${customer.id}`}
              className="btn-primary btn-sm"
            >
              New reservation
            </Link>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Booking history</h2>
          {customer.reservations.length === 0 ? (
            <EmptyState title="No bookings yet" hint="Saved ahead of their first hire." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Vehicle</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th className="text-right">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.reservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td>
                        <Link
                          href={`/admin/reservations/${reservation.id}`}
                          className="font-mono text-accent hover:underline"
                        >
                          {reservation.reference}
                        </Link>
                      </td>
                      <td className="text-xs">
                        {reservation.vehicle.make} {reservation.vehicle.model}
                      </td>
                      <td className="whitespace-nowrap text-xs">
                        {formatDateTime(reservation.startAt)}
                      </td>
                      <td>
                        <StatusBadge status={reservation.status} />
                      </td>
                      <td className="text-right tabular-nums">
                        {formatMoney(reservation.amountPaid, reservation.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {licenceExpired ? (
            <div className="card border-danger/40 bg-danger-soft p-4 text-sm text-danger">
              This licence expired on {formatDate(customer.licenseExpiry!)}. Check a current one
              before the next hire.
            </div>
          ) : null}

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Saved details</h2>
            <p className="mb-4 text-sm text-muted">
              These fill in automatically when you start a reservation for this customer.
            </p>
            <CustomerForm
              values={{
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                licenseNumber: customer.licenseNumber ?? "",
                licenseExpiry: customer.licenseExpiry
                  ? toDateInputValue(customer.licenseExpiry)
                  : "",
                licenseCountry: customer.licenseCountry ?? "",
              }}
            />
          </section>
        </aside>
      </div>
    </>
  );
}
