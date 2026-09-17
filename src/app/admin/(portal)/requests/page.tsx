import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { EmptyState, PageHeading } from "@/components/ui";
import { DriverAssignment, PriceEditor, StatusActions } from "../reservations/[id]/manage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Chauffeur requests" };

export default async function RequestsPage() {
  const [requests, drivers] = await Promise.all([
    prisma.reservation.findMany({
      where: { type: "chauffeur", status: "pending" },
      include: { vehicle: true, customer: true, chauffeurTrip: { include: { driver: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.driver.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeading
        title="Chauffeur requests"
        description={
          config.chauffeurHoldsOnRequest
            ? "Pending requests hold the vehicle until you confirm or decline."
            : "Pending requests do not hold the vehicle — confirm quickly to secure it."
        }
      />

      {requests.length === 0 ? (
        <EmptyState title="Nothing waiting" hint="New chauffeur requests land here." />
      ) : (
        <div className="space-y-6">
          {requests.map((request) => (
            <article key={request.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/admin/reservations/${request.id}`}
                    className="font-mono font-semibold text-accent hover:underline"
                  >
                    {request.reference}
                  </Link>
                  <h2 className="mt-1 text-lg font-semibold">{request.customer.name}</h2>
                  <p className="text-sm text-muted">
                    <a href={`tel:${request.customer.phone}`} className="underline">
                      {request.customer.phone}
                    </a>{" "}
                    ·{" "}
                    <a href={`mailto:${request.customer.email}`} className="underline">
                      {request.customer.email}
                    </a>
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">
                    {request.vehicle.year} {request.vehicle.make} {request.vehicle.model}
                  </p>
                  <p className="text-muted">{request.vehicle.plate}</p>
                </div>
              </div>

              <dl className="mt-5 grid gap-3 border-t border-line pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Pickup</dt>
                  <dd>{formatDateTime(request.startAt)}</dd>
                  <dd className="text-muted">{request.chauffeurTrip?.pickupAddress}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Drop-off</dt>
                  <dd>{formatDateTime(request.endAt)}</dd>
                  <dd className="text-muted">{request.chauffeurTrip?.dropoffAddress}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Party</dt>
                  <dd>{request.chauffeurTrip?.passengers} passengers</dd>
                  <dd className="text-muted">{request.chauffeurTrip?.luggageNotes || "No luggage noted"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Estimate</dt>
                  <dd className="font-medium">{formatMoney(request.priceTotal, request.currency)}</dd>
                  <dd className="text-muted">{request.chauffeurTrip?.specialRequests || "No special requests"}</dd>
                </div>
              </dl>

              <div className="mt-5 grid gap-5 border-t border-line pt-5 lg:grid-cols-3">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">1. Assign a driver</h3>
                  <DriverAssignment
                    reservationId={request.id}
                    drivers={drivers}
                    currentDriverId={request.chauffeurTrip?.driverId ?? null}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">2. Set the price</h3>
                  <PriceEditor
                    id={request.id}
                    priceTotal={request.priceTotal}
                    amountPaid={request.amountPaid}
                    currency={request.currency}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">3. Confirm</h3>
                  <StatusActions id={request.id} status={request.status} type={request.type} />
                  <p className="hint mt-2">Confirming emails the customer the trip details.</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
