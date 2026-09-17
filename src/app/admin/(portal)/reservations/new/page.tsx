import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { PageHeading } from "@/components/ui";
import { NewReservationForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New reservation" };

export default async function NewReservationPage() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { not: "out_of_service" } },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });

  return (
    <>
      <Link href="/admin/reservations" className="text-sm font-semibold text-accent">
        ← All reservations
      </Link>
      <div className="mt-4">
        <PageHeading
          title="New reservation"
          description="For walk-ins and phone bookings. The same availability rules apply."
        />
      </div>

      <div className="max-w-3xl">
        <NewReservationForm
          vehicles={vehicles.map((vehicle) => ({
            id: vehicle.id,
            label: `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.plate} · ${formatMoney(
              vehicle.dailyRateSelfDrive,
            )}/day`,
          }))}
        />
      </div>
    </>
  );
}
