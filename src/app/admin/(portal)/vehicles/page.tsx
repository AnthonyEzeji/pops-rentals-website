import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Alert, EmptyState, PageHeading, StatusBadge, humanize } from "@/components/ui";
import { setVehicleStatus, deleteVehicle } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vehicles" };

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;

  const vehicles = await prisma.vehicle.findMany({
    orderBy: [{ status: "asc" }, { make: "asc" }, { model: "asc" }],
    include: {
      _count: { select: { reservations: true } },
      maintenance: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  return (
    <>
      <PageHeading
        title="Vehicles"
        description="Rates, status and photos. Status changes take effect on the public site immediately."
        action={
          <Link href="/admin/vehicles/new" className="btn-primary btn-sm">
            Add vehicle
          </Link>
        }
      />

      {query.saved ? (
        <div className="mb-6">
          <Alert tone="success">Vehicle saved.</Alert>
        </div>
      ) : null}

      {vehicles.length === 0 ? (
        <EmptyState title="No vehicles yet" hint="Add your first vehicle to start taking bookings." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Specs</th>
                <th className="text-right">Self-drive</th>
                <th className="text-right">Chauffeur</th>
                <th>Last service</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <Link
                      href={`/admin/vehicles/${vehicle.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </Link>
                    <div className="text-xs text-muted">
                      {vehicle.plate} · {vehicle._count.reservations} booking
                      {vehicle._count.reservations === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="text-xs text-muted">
                    {humanize(vehicle.category)} · {vehicle.seats} seats
                    <br />
                    {humanize(vehicle.transmission)} · {humanize(vehicle.fuelType)}
                  </td>
                  <td className="text-right tabular-nums">
                    {formatMoney(vehicle.dailyRateSelfDrive)}
                    <div className="text-xs text-muted">per day</div>
                  </td>
                  <td className="text-right tabular-nums">
                    {vehicle.chauffeurHourlyRate ? (
                      <>
                        {formatMoney(vehicle.chauffeurHourlyRate)}
                        <div className="text-xs text-muted">per hour</div>
                      </>
                    ) : vehicle.chauffeurDayRate ? (
                      <>
                        {formatMoney(vehicle.chauffeurDayRate)}
                        <div className="text-xs text-muted">per day</div>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-xs text-muted">
                    {vehicle.maintenance[0] ? formatDate(vehicle.maintenance[0].date) : "—"}
                  </td>
                  <td>
                    <form action={setVehicleStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={vehicle.id} />
                      <select
                        name="status"
                        defaultValue={vehicle.status}
                        className="input py-1 text-xs"
                        aria-label={`Status for ${vehicle.make} ${vehicle.model}`}
                      >
                        <option value="available">Available</option>
                        <option value="reserved">Reserved</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="out_of_service">Out of service</option>
                      </select>
                      <button type="submit" className="btn-secondary btn-sm">
                        Set
                      </button>
                    </form>
                    <div className="mt-1">
                      <StatusBadge status={vehicle.status} kind="vehicle" />
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/vehicles/${vehicle.id}`} className="btn-secondary btn-sm">
                        Edit
                      </Link>
                      <form action={deleteVehicle}>
                        <input type="hidden" name="id" value={vehicle.id} />
                        <button type="submit" className="btn-danger btn-sm">
                          {vehicle._count.reservations > 0 ? "Retire" : "Delete"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="hint mt-4">
        Vehicles with booking history are retired (set out of service) rather than deleted, so
        reports stay accurate.
      </p>
    </>
  );
}
