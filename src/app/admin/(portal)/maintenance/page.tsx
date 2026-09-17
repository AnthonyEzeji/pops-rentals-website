import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { EmptyState, PageHeading } from "@/components/ui";
import { removeBlock } from "../actions";
import { BlockForm, MaintenanceForm } from "./forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Maintenance" };

export default async function MaintenancePage() {
  const [vehicles, records, blocks] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: [{ make: "asc" }, { model: "asc" }] }),
    prisma.maintenanceRecord.findMany({
      include: { vehicle: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.vehicleBlock.findMany({
      where: { endAt: { gte: new Date() } },
      include: { vehicle: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const options = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.plate}`,
  }));

  return (
    <>
      <PageHeading
        title="Maintenance"
        description="Log work against a vehicle and take it off the road for the dates it is in the shop."
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Blocked dates</h2>
            {blocks.length === 0 ? (
              <EmptyState title="No vehicle is blocked" hint="Every vehicle is bookable." />
            ) : (
              <div className="card overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Reason</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map((block) => (
                      <tr key={block.id}>
                        <td>
                          <div className="font-medium">
                            {block.vehicle.make} {block.vehicle.model}
                          </div>
                          <div className="text-xs text-muted">{block.vehicle.plate}</div>
                        </td>
                        <td>{formatDate(block.startAt)}</td>
                        <td>{formatDate(block.endAt)}</td>
                        <td className="text-xs">
                          {block.reason.replace("_", " ")}
                          {block.note ? <div className="text-muted">{block.note}</div> : null}
                        </td>
                        <td className="text-right">
                          <form action={removeBlock}>
                            <input type="hidden" name="id" value={block.id} />
                            <button type="submit" className="btn-secondary btn-sm">
                              Release
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Service history</h2>
            {records.length === 0 ? (
              <EmptyState title="Nothing logged yet" />
            ) : (
              <div className="card overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Vehicle</th>
                      <th>Work</th>
                      <th className="text-right">Cost</th>
                      <th>Next due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td className="whitespace-nowrap">{formatDate(record.date)}</td>
                        <td>
                          <div className="font-medium">
                            {record.vehicle.make} {record.vehicle.model}
                          </div>
                          <div className="text-xs text-muted">{record.vehicle.plate}</div>
                        </td>
                        <td>
                          <div>{record.type}</div>
                          {record.description ? (
                            <div className="text-xs text-muted">{record.description}</div>
                          ) : null}
                        </td>
                        <td className="text-right tabular-nums">{formatMoney(record.cost)}</td>
                        <td className="text-xs text-muted">
                          {record.nextDueDate ? formatDate(record.nextDueDate) : "—"}
                          {record.nextDueOdometer
                            ? ` · ${record.nextDueOdometer.toLocaleString()} km`
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Log maintenance</h2>
            <MaintenanceForm vehicles={options} />
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Block dates</h2>
            <p className="mb-4 text-sm text-muted">
              Takes the vehicle out of bookable inventory for a window, without logging work.
            </p>
            <BlockForm vehicles={options} />
          </section>
        </aside>
      </div>
    </>
  );
}
