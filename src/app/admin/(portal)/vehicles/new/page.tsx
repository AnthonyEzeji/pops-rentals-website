import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { PageHeading } from "@/components/ui";
import { VehicleForm } from "../vehicle-form";

export const metadata: Metadata = { title: "Add vehicle" };

export default function NewVehiclePage() {
  return (
    <>
      <Link href="/admin/vehicles" className="text-sm font-semibold text-accent">
        ← All vehicles
      </Link>
      <div className="mt-4">
        <PageHeading title="Add a vehicle" description="It appears on the public site as soon as its status is available." />
      </div>

      <div className="max-w-4xl">
        <VehicleForm
          currency={config.currency}
          values={{
            make: "",
            model: "",
            year: new Date().getFullYear(),
            plate: "",
            vin: "",
            category: "sedan",
            seats: 5,
            transmission: "automatic",
            fuelType: "petrol",
            status: "available",
            dailyRateSelfDrive: "",
            chauffeurHourlyRate: "",
            chauffeurDayRate: "",
            odometer: "",
            engine: "",
            horsepower: "",
            zeroToSixty: "",
            topSpeed: "",
            features: "",
            photos: "",
            description: "",
          }}
        />
      </div>
    </>
  );
}
