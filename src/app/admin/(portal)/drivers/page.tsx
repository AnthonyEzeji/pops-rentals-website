import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/dates";
import { EmptyState, PageHeading } from "@/components/ui";
import { toggleDriver } from "../actions";
import { DriverForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Drivers" };

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      trips: {
        where: { reservation: { status: { in: ["confirmed", "in_progress"] } } },
        include: { reservation: true },
        orderBy: { reservation: { startAt: "asc" } },
        take: 3,
      },
    },
  });

  return (
    <>
      <PageHeading
        title="Drivers"
        description="Who can be assigned to chauffeur trips."
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          {drivers.length === 0 ? (
            <EmptyState title="No drivers yet" hint="Add one to start assigning chauffeur trips." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Contact</th>
                    <th>Licence</th>
                    <th>Next trips</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver) => (
                    <tr key={driver.id} className={driver.active ? "" : "opacity-60"}>
                      <td>
                        <div className="font-medium">{driver.name}</div>
                        {driver.notes ? (
                          <div className="text-xs text-muted">{driver.notes}</div>
                        ) : null}
                      </td>
                      <td className="text-xs">
                        <div>{driver.phone}</div>
                        <div className="text-muted">{driver.email ?? "—"}</div>
                      </td>
                      <td className="text-xs">{driver.licenseNumber}</td>
                      <td className="text-xs">
                        {driver.trips.length === 0 ? (
                          <span className="text-muted">None</span>
                        ) : (
                          driver.trips.map((trip) => (
                            <div key={trip.id}>
                              <Link
                                href={`/admin/reservations/${trip.reservationId}`}
                                className="text-accent hover:underline"
                              >
                                {formatDateTime(trip.reservation.startAt)}
                              </Link>
                            </div>
                          ))
                        )}
                      </td>
                      <td className="text-right">
                        <form action={toggleDriver}>
                          <input type="hidden" name="id" value={driver.id} />
                          <button type="submit" className="btn-secondary btn-sm">
                            {driver.active ? "Deactivate" : "Reactivate"}
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
            <h2 className="mb-4 font-semibold">Add a driver</h2>
            <DriverForm />
          </section>
        </aside>
      </div>
    </>
  );
}
