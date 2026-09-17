import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { config, stripeEnabled } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { findConflict, quoteSelfDrive } from "@/lib/availability";
import { Alert } from "@/components/ui";
import { SelfDriveForm } from "./form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Self-drive booking",
  robots: { index: false },
};

function one(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function SelfDriveBookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const slug = one(query, "vehicle");
  const start = one(query, "start");
  const end = one(query, "end");

  if (!slug) redirect("/vehicles");

  const vehicle = await prisma.vehicle.findUnique({ where: { slug } });
  if (!vehicle) notFound();

  // Times carry over from the search widget's hour selects (service hours are
  // 9am–9pm) and stay editable on the form below.
  const pad = (hour: string) => String(hour).padStart(2, "0");
  const startHour = one(query, "startHour") ?? "9";
  const endHour = one(query, "endHour") ?? "9";
  const startAt = start ? new Date(`${start}T${pad(startHour)}:00`) : null;
  const endAt = end ? new Date(`${end}T${pad(endHour)}:00`) : null;
  const hasRange =
    startAt && endAt && !Number.isNaN(startAt.getTime()) && !Number.isNaN(endAt.getTime()) && endAt > startAt;

  if (!hasRange) {
    return (
      <div className="container-page max-w-2xl py-12">
        <Alert tone="warning">
          Choose your pickup and return dates first.{" "}
          <Link href={`/vehicles/${vehicle.slug}`} className="font-semibold underline">
            Back to the vehicle
          </Link>
          .
        </Alert>
      </div>
    );
  }

  const quote = quoteSelfDrive(vehicle, startAt, endAt);
  const conflict = await findConflict(prisma, vehicle.id, startAt, endAt);

  return (
    <div className="container-page py-10">
      <Link href={`/vehicles/${vehicle.slug}`} className="text-sm font-semibold text-accent">
        ← Back to the vehicle
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Complete your booking</h1>
          <p className="mt-1 text-sm text-muted">
            {stripeEnabled
              ? `We'll take a ${config.selfDriveDepositPercent}% deposit now; the balance is due at collection.`
              : "Payment is taken at collection — online payment is not enabled on this site yet."}
          </p>

          {conflict ? (
            <div className="mt-6">
              <Alert tone="error">
                {conflict.detail}{" "}
                <Link href="/vehicles" className="font-semibold underline">
                  See what else is free
                </Link>
                .
              </Alert>
            </div>
          ) : (
            <div className="mt-6">
              <SelfDriveForm
                vehicleId={vehicle.id}
                startAt={startAt.toISOString()}
                endAt={endAt.toISOString()}
              />
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="font-semibold">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {vehicle.seats} seats · {vehicle.transmission} · {vehicle.fuelType}
            </p>

            <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Collection</dt>
                <dd className="text-right font-medium">{formatDateTime(startAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Return</dt>
                <dd className="text-right font-medium">{formatDateTime(endAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">
                  {quote.unitLabel} × {formatMoney(vehicle.dailyRateSelfDrive)}
                </dt>
                <dd className="text-right font-medium">{formatMoney(quote.subtotal)}</dd>
              </div>
              {quote.discount > 0 ? (
                <div className="flex justify-between gap-4 text-accent">
                  <dt>{quote.discountLabel}</dt>
                  <dd className="text-right font-semibold">−{formatMoney(quote.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Total</dt>
                <dd className="text-right font-medium">{formatMoney(quote.total)}</dd>
              </div>
            </dl>

            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="font-medium">Due now</dt>
                <dd className="text-lg font-semibold">
                  {formatMoney(stripeEnabled ? quote.deposit : 0)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Due at collection</dt>
                <dd className="font-medium">
                  {formatMoney(stripeEnabled ? quote.balanceDue : quote.total)}
                </dd>
              </div>
            </dl>

            <p className="hint mt-4">
              Free cancellation until {config.cancellationWindowHours} hours before collection. See
              the{" "}
              <Link href="/policies" className="underline">
                rental policies
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
