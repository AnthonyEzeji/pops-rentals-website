import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { ChauffeurForm } from "./form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chauffeur request",
  description: "Send us your trip details and we'll confirm the vehicle, driver and final price.",
};

/** Occasion slugs used by the home page entry points. */
const OCCASION_LABELS: Record<string, string> = {
  wedding: "Wedding",
  airport: "Airport transfer",
  corporate: "Corporate / VIP",
  photoshoot: "Photo shoot",
  "music-video": "Music video",
  events: "Event or night out",
  tour: "Day tour",
};

function one(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ChauffeurRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const slug = one(query, "vehicle");
  const occasion = one(query, "occasion");

  // Only vehicles that carry a chauffeur rate can be requested with a driver.
  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: { not: "out_of_service" },
      OR: [{ chauffeurHourlyRate: { not: null } }, { chauffeurDayRate: { not: null } }],
    },
    orderBy: { chauffeurHourlyRate: "asc" },
  });

  const selected = vehicles.find((v) => v.slug === slug) ?? vehicles[0];

  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Request a chauffeur</h1>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Tell us where you are going and when. We confirm the vehicle, the driver and the final
            price before anything is charged — nothing is taken from you now.
          </p>

          {vehicles.length === 0 ? (
            <p className="mt-6 text-muted">
              No chauffeur-ready vehicles are listed at the moment. Please check back soon.
            </p>
          ) : (
            <div className="mt-6">
              <ChauffeurForm
                vehicles={vehicles.map((v) => ({
                  id: v.id,
                  label: `${v.year} ${v.make} ${v.model} · ${v.seats} seats`,
                  seats: v.seats,
                  rate: v.chauffeurHourlyRate
                    ? `${formatMoney(v.chauffeurHourlyRate)}/hour`
                    : v.chauffeurDayRate
                      ? `${formatMoney(v.chauffeurDayRate)}/day`
                      : "",
                }))}
                selectedId={selected?.id ?? ""}
                occasion={OCCASION_LABELS[occasion ?? ""] ?? ""}
              />
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6 text-sm">
            <h2 className="font-semibold">How it works</h2>
            <ol className="mt-3 space-y-3 text-muted">
              <li>
                <span className="font-medium text-ink">1. You send the details.</span> Pickup,
                drop-off, timings, passengers and anything special.
              </li>
              <li>
                <span className="font-medium text-ink">2. We confirm.</span> Our team checks the
                vehicle, assigns a driver and sets the final price.
              </li>
              <li>
                <span className="font-medium text-ink">3. You get an email.</span> With the driver,
                the vehicle and the agreed price.
              </li>
            </ol>
            <p className="hint mt-5">
              Prices shown are estimates. The confirmed quote may differ for waiting time, tolls, or
              out-of-area travel.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
