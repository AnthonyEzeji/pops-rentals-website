import type { Metadata } from "next";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms, cancellation & damage policy",
  description: "Rental terms, cancellation windows, deposits and the damage policy.",
};

export const dynamic = "force-dynamic";

/**
 * PRD P11. The numbers come from config so the published policy and the booking
 * engine can never disagree. The wording below is a starting point and should be
 * reviewed by the operator (and ideally a lawyer) before launch.
 */
export default function PoliciesPage() {
  const sections = [
    {
      id: "rental-terms",
      title: "Rental terms",
      body: [
        `The minimum hire period is ${config.minRentalDays} day${config.minRentalDays === 1 ? "" : "s"}. Rates are quoted per day and include standard insurance unless stated otherwise.`,
        "The driver named on the booking must present a valid licence at collection, along with the payment card and a form of photo identification. Licences must remain valid for the whole rental period.",
        "The vehicle is supplied with a full tank and should be returned with a full tank. Fuel not replaced is charged at cost plus a refuelling fee.",
        "Smoking, animals without a carrier, off-road use and sub-letting the vehicle are not permitted.",
      ],
    },
    {
      id: "payment",
      title: "Payment & deposit",
      body: [
        `A ${config.selfDriveDepositPercent}% deposit is taken at the time of booking. The balance is due at collection.`,
        "A refundable security hold may be placed on the payment card at collection to cover fuel, tolls, fines and any damage excess.",
        "Chauffeur trips are quoted before confirmation. Nothing is charged until we confirm the vehicle, driver and price.",
      ],
    },
    {
      id: "cancellation",
      title: "Cancellation & changes",
      body: [
        `Cancel free of charge up to ${config.cancellationWindowHours} hours before the start of the hire and the deposit is refunded in full.`,
        `Inside ${config.cancellationWindowHours} hours, the deposit is forfeited. No-shows are charged the first day of hire.`,
        "Date changes are free subject to availability. Ask us as early as you can — popular vehicles book out.",
        "If we cannot supply the booked vehicle we will offer an equivalent or better vehicle, or a full refund.",
      ],
    },
    {
      id: "damage",
      title: "Damage, fines & liability",
      body: [
        "The vehicle is inspected and photographed at collection and return. New damage is charged up to the insurance excess stated on your rental agreement.",
        "Traffic fines, tolls and parking charges incurred during the hire are the hirer's responsibility and are passed on with an administration fee.",
        "Breakdowns and accidents must be reported to us immediately. Do not authorise repairs without our written agreement.",
      ],
    },
    {
      id: "chauffeur",
      title: "Chauffeur service",
      body: [
        "Chauffeur bookings include the driver, fuel and standard waiting time. Additional waiting time is billed in 30-minute blocks.",
        "Trips that overrun the booked window are charged at the hourly rate. We will always tell you before the clock starts.",
        "Our drivers may decline to carry more passengers than the vehicle is licensed for, or to continue a trip where behaviour is unsafe.",
      ],
    },
    {
      id: "privacy",
      title: "Your data",
      body: [
        "We collect your contact and licence details to fulfil the rental, meet insurance requirements and comply with the law. Card details are handled by our payment provider and are never stored on our systems.",
        "We keep rental records for as long as tax and insurance rules require, then delete them.",
      ],
    },
  ];

  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Terms & policies</h1>
      <p className="mt-2 text-muted">
        These terms apply to every booking with {config.businessName}. They form part of your rental
        agreement.
      </p>

      <nav aria-label="On this page" className="card mt-8 p-4">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-accent hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <div className="mt-3 space-y-3 text-muted">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
