import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { uploadsEnabled } from "@/lib/uploads";
import { formatMoney, toMajorUnits } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import { PageHeading, StatusBadge } from "@/components/ui";
import { VehicleForm } from "../vehicle-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit vehicle" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      reservations: {
        where: { status: { not: "cancelled" }, endAt: { gte: new Date() } },
        include: { customer: true },
        orderBy: { startAt: "asc" },
        take: 5,
      },
      blocks: { where: { endAt: { gte: new Date() } }, orderBy: { startAt: "asc" } },
      maintenance: { orderBy: { date: "desc" }, take: 5 },
      expenses: { orderBy: { date: "desc" }, take: 5 },
    },
  });
  if (!vehicle) notFound();

  const spend = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { vehicleId: vehicle.id },
  });
  const earned = await prisma.reservation.aggregate({
    _sum: { amountPaid: true },
    where: { vehicleId: vehicle.id, status: { not: "cancelled" } },
  });

  return (
    <>
      <Link href="/admin/vehicles" className="text-sm font-semibold text-accent">
        ← All vehicles
      </Link>
      <div className="mt-4">
        <PageHeading
          title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          description={`${vehicle.plate} · ${vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : "odometer not set"}`}
          action={
            <div className="flex items-center gap-2">
              <StatusBadge status={vehicle.status} kind="vehicle" />
              <Link href={`/vehicles/${vehicle.slug}`} className="btn-secondary btn-sm">
                View listing
              </Link>
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="max-w-4xl">
          <VehicleForm
            currency={config.currency}
            canUpload={uploadsEnabled()}
            values={{
              id: vehicle.id,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              plate: vehicle.plate,
              vin: vehicle.vin ?? "",
              category: vehicle.category,
              seats: vehicle.seats,
              transmission: vehicle.transmission,
              fuelType: vehicle.fuelType,
              status: vehicle.status,
              dailyRateSelfDrive: toMajorUnits(vehicle.dailyRateSelfDrive),
              chauffeurHourlyRate: vehicle.chauffeurHourlyRate
                ? toMajorUnits(vehicle.chauffeurHourlyRate)
                : "",
              chauffeurDayRate: vehicle.chauffeurDayRate
                ? toMajorUnits(vehicle.chauffeurDayRate)
                : "",
              odometer: vehicle.odometer ?? "",
              engine: vehicle.engine ?? "",
              horsepower: vehicle.horsepower ?? "",
              zeroToSixty: vehicle.zeroToSixty ?? "",
              topSpeed: vehicle.topSpeed ?? "",
              features: vehicle.features.join("\n"),
              photos: vehicle.photos.join("\n"),
              description: vehicle.description,
            }}
          />
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Lifetime</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Collected</dt>
                <dd className="font-medium">{formatMoney(earned._sum.amountPaid ?? 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Spent</dt>
                <dd className="font-medium">{formatMoney(spend._sum.amount ?? 0)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="font-medium">Net</dt>
                <dd className="font-semibold">
                  {formatMoney((earned._sum.amountPaid ?? 0) - (spend._sum.amount ?? 0))}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Upcoming</h2>
            {vehicle.reservations.length === 0 && vehicle.blocks.length === 0 ? (
              <p className="text-sm text-muted">Nothing booked.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {vehicle.reservations.map((reservation) => (
                  <li key={reservation.id}>
                    <Link
                      href={`/admin/reservations/${reservation.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {reservation.customer.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {formatDateTime(reservation.startAt)} → {formatDateTime(reservation.endAt)}
                    </p>
                  </li>
                ))}
                {vehicle.blocks.map((block) => (
                  <li key={block.id}>
                    <span className="font-medium">{block.reason.replace("_", " ")}</span>
                    <p className="text-xs text-muted">
                      {formatDate(block.startAt)} → {formatDate(block.endAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Recent maintenance</h2>
            {vehicle.maintenance.length === 0 ? (
              <p className="text-sm text-muted">Nothing logged.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {vehicle.maintenance.map((record) => (
                  <li key={record.id}>
                    <span className="font-medium">{record.type}</span> · {formatMoney(record.cost)}
                    <p className="text-xs text-muted">{formatDate(record.date)}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/maintenance" className="mt-3 inline-block text-sm text-accent">
              Log maintenance →
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
