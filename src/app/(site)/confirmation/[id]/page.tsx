import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Alert, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Confirmation", robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;

  // The reference is what the customer sees in their email; ids also resolve so
  // an admin can paste either.
  const reservation = await prisma.reservation.findFirst({
    where: { OR: [{ reference: id.toUpperCase() }, { id }] },
    include: { vehicle: true, customer: true, chauffeurTrip: { include: { driver: true } } },
  });
  if (!reservation) notFound();

  const isChauffeur = reservation.type === "chauffeur";
  const paymentCancelled = query.cancelled === "1";
  const balance = reservation.priceTotal - reservation.amountPaid;

  return (
    <div className="container-page max-w-2xl py-12">
      <div className="card relative overflow-hidden p-8">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-brand via-brand/30 to-transparent"
        />
        <span
          aria-hidden
          className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-brand-ink shadow-(--shadow-glow)"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
            <path d="m8.2 13.4-3-3 1.2-1.2 1.8 1.8 5-5 1.2 1.2-6.2 6.2Z" />
          </svg>
        </span>
        <p className="eyebrow">{isChauffeur ? "Request received" : "Booking received"}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {isChauffeur ? "We're on it." : "You're booked."}
        </h1>
        <p className="mt-3 text-muted">
          {isChauffeur
            ? "Our team is checking the vehicle and driver for your trip. You'll get an email as soon as it's confirmed — usually within the hour during business hours."
            : "A confirmation email is on its way. Bring your driver's licence to collection."}
        </p>

        {paymentCancelled ? (
          <div className="mt-6">
            <Alert tone="warning">
              Payment was not completed, so this reservation is still pending. We hold the vehicle
              for a short while — reply to the confirmation email or call us to pay.
            </Alert>
          </div>
        ) : null}

        <dl className="mt-8 space-y-3 border-t border-line pt-6 text-sm">
          <Row label="Reference">
            <span className="font-mono font-semibold">{reservation.reference}</span>
          </Row>
          <Row label="Status">
            <StatusBadge status={reservation.status} />
          </Row>
          <Row label="Vehicle">
            {reservation.vehicle.year} {reservation.vehicle.make} {reservation.vehicle.model}
          </Row>
          <Row label={isChauffeur ? "Pickup" : "Collection"}>
            {formatDateTime(reservation.startAt)}
          </Row>
          <Row label={isChauffeur ? "Expected finish" : "Return"}>
            {formatDateTime(reservation.endAt)}
          </Row>
          {reservation.chauffeurTrip ? (
            <>
              <Row label="From">{reservation.chauffeurTrip.pickupAddress}</Row>
              <Row label="To">{reservation.chauffeurTrip.dropoffAddress}</Row>
              <Row label="Passengers">{reservation.chauffeurTrip.passengers}</Row>
              {reservation.chauffeurTrip.driver ? (
                <Row label="Driver">{reservation.chauffeurTrip.driver.name}</Row>
              ) : null}
            </>
          ) : null}
          <Row label={isChauffeur ? "Estimate" : "Total"}>
            {formatMoney(reservation.priceTotal, reservation.currency)}
          </Row>
          {reservation.amountPaid > 0 ? (
            <Row label="Paid">{formatMoney(reservation.amountPaid, reservation.currency)}</Row>
          ) : null}
          {!isChauffeur && reservation.securityDeposit > 0 ? (
            <Row label="Refundable security deposit">
              {formatMoney(reservation.securityDeposit, reservation.currency)}
            </Row>
          ) : null}
          {balance + reservation.securityDeposit > 0 ? (
            <Row label={isChauffeur ? "Due after confirmation" : "Due at collection"}>
              {formatMoney(
                balance + (isChauffeur ? 0 : reservation.securityDeposit),
                reservation.currency,
              )}
            </Row>
          ) : null}
        </dl>

        <p className="mt-8 text-sm text-muted">
          Need to change something? Reply to your confirmation email quoting{" "}
          <span className="font-mono">{reservation.reference}</span>. Free cancellation applies up to{" "}
          {config.cancellationWindowHours} hours before the start — see the{" "}
          <Link href="/policies" className="underline">
            policies
          </Link>
          .
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/vehicles" className="btn-secondary">
            Back to the fleet
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
