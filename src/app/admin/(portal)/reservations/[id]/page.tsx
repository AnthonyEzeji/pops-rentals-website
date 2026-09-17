import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import { withinFreeCancellation } from "@/lib/booking";
import { PageHeading, StatusBadge } from "@/components/ui";
import { DriverAssignment, PriceEditor, RescheduleForm, StatusActions } from "./manage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reservation" };

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      vehicle: true,
      customer: true,
      chauffeurTrip: { include: { driver: true } },
      statusEvents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!reservation) notFound();

  const drivers = await prisma.driver.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const balance = reservation.priceTotal - reservation.amountPaid;
  const freeCancellation = withinFreeCancellation(reservation.startAt);

  return (
    <>
      <Link href="/admin/reservations" className="text-sm font-semibold text-accent">
        ← All reservations
      </Link>

      <div className="mt-4">
        <PageHeading
          title={reservation.reference}
          description={`${reservation.type === "chauffeur" ? "Chauffeur trip" : "Self-drive hire"} · created ${formatDate(reservation.createdAt)}`}
          action={
            <div className="flex items-center gap-2">
              <StatusBadge status={reservation.status} />
              <StatusBadge status={reservation.paymentStatus} kind="payment" />
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Actions</h2>
            <StatusActions id={reservation.id} status={reservation.status} type={reservation.type} />
            {!freeCancellation && reservation.status !== "cancelled" ? (
              <p className="hint mt-3">
                Inside the free-cancellation window — cancelling now forfeits the deposit under the
                published policy.
              </p>
            ) : null}
          </section>

          {reservation.type === "chauffeur" && reservation.chauffeurTrip ? (
            <section className="card p-5">
              <h2 className="mb-4 font-semibold">Trip</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Pickup">{reservation.chauffeurTrip.pickupAddress}</Detail>
                <Detail label="Drop-off">{reservation.chauffeurTrip.dropoffAddress}</Detail>
                <Detail label="Passengers">{reservation.chauffeurTrip.passengers}</Detail>
                <Detail label="Luggage">{reservation.chauffeurTrip.luggageNotes || "—"}</Detail>
                <Detail label="Special requests">
                  {reservation.chauffeurTrip.specialRequests || "—"}
                </Detail>
              </dl>

              <div className="mt-5 border-t border-line pt-5">
                <DriverAssignment
                  reservationId={reservation.id}
                  drivers={drivers}
                  currentDriverId={reservation.chauffeurTrip.driverId}
                />
              </div>
            </section>
          ) : null}

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Dates</h2>
            <RescheduleForm
              id={reservation.id}
              startAt={reservation.startAt.toISOString()}
              endAt={reservation.endAt.toISOString()}
            />
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Money</h2>
            <PriceEditor
              id={reservation.id}
              priceTotal={reservation.priceTotal}
              amountPaid={reservation.amountPaid}
              currency={reservation.currency}
            />
            <p className="hint mt-3">
              Outstanding balance {formatMoney(balance, reservation.currency)}.
              {reservation.stripePaymentIntentId
                ? " Paid through Stripe — refund from the Stripe dashboard."
                : ""}
            </p>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">History</h2>
            <ol className="space-y-3 text-sm">
              {reservation.statusEvents.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
                  <div>
                    <p>
                      {event.fromStatus ? `${event.fromStatus} → ` : ""}
                      <strong>{event.toStatus}</strong>
                      {event.note ? ` · ${event.note}` : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(event.createdAt)} · {event.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Customer</h2>
            <dl className="space-y-3 text-sm">
              <Detail label="Name">{reservation.customer.name}</Detail>
              <Detail label="Email">
                <a href={`mailto:${reservation.customer.email}`} className="text-accent underline">
                  {reservation.customer.email}
                </a>
              </Detail>
              <Detail label="Phone">
                <a href={`tel:${reservation.customer.phone}`} className="text-accent underline">
                  {reservation.customer.phone}
                </a>
              </Detail>
              {reservation.customer.licenseNumber ? (
                <>
                  <Detail label="Licence">{reservation.customer.licenseNumber}</Detail>
                  <Detail label="Licence expiry">
                    {reservation.customer.licenseExpiry
                      ? formatDate(reservation.customer.licenseExpiry)
                      : "—"}
                  </Detail>
                  <Detail label="Issued in">{reservation.customer.licenseCountry ?? "—"}</Detail>
                </>
              ) : null}
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Vehicle</h2>
            <dl className="space-y-3 text-sm">
              <Detail label="Vehicle">
                <Link href="/admin/vehicles" className="text-accent underline">
                  {reservation.vehicle.year} {reservation.vehicle.make} {reservation.vehicle.model}
                </Link>
              </Detail>
              <Detail label="Registration">{reservation.vehicle.plate}</Detail>
              <Detail label="Status">
                <StatusBadge status={reservation.vehicle.status} kind="vehicle" />
              </Detail>
              <Detail label="Holds the vehicle">
                {reservation.holdsAvailability ? "Yes" : "No — not blocking dates"}
              </Detail>
            </dl>
          </section>

          {reservation.notes ? (
            <section className="card p-5">
              <h2 className="mb-2 font-semibold">Notes</h2>
              <p className="text-sm text-muted">{reservation.notes}</p>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
