import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "How booking works, what you need to rent, deposits, cancellation, chauffeur hire and long-term rates.",
};

export default async function FaqPage() {
  // The answers quote live numbers so the FAQ can never drift from the booking
  // engine or the price list.
  const [count, cheapest, dearest] = await Promise.all([
    prisma.vehicle.count({ where: { status: { not: "out_of_service" } } }),
    prisma.vehicle.findFirst({
      where: { status: { not: "out_of_service" } },
      orderBy: { dailyRateSelfDrive: "asc" },
    }),
    prisma.vehicle.findFirst({
      where: { status: { not: "out_of_service" } },
      orderBy: { dailyRateSelfDrive: "desc" },
    }),
  ]);

  const faqs: Array<{ q: string; a: React.ReactNode; plain: string }> = [
    {
      q: `How do I rent a car from ${config.businessName}?`,
      plain: `Browse the fleet, pick your dates and book online. You pay a ${config.selfDriveDepositPercent}% deposit to confirm, and the balance at collection.`,
      a: (
        <>
          <Link href="/vehicles" className="text-accent underline">
            Browse the fleet
          </Link>
          , choose your pickup and return dates, and book online. Availability is checked live as you
          book, so anything you can select is genuinely free. You pay a{" "}
          {config.selfDriveDepositPercent}% deposit to confirm and the balance at collection.
        </>
      ),
    },
    {
      q: "How much does it cost?",
      plain: `Daily rates run from ${cheapest ? formatMoney(cheapest.dailyRateSelfDrive) : "—"} to ${dearest ? formatMoney(dearest.dailyRateSelfDrive) : "—"} per day, with ${config.weeklyDiscountPercent}% off weekly hires.`,
      a: (
        <>
          Daily rates currently run from{" "}
          <strong>{cheapest ? formatMoney(cheapest.dailyRateSelfDrive) : "—"}</strong> for the{" "}
          {cheapest ? `${cheapest.make} ${cheapest.model}` : "entry-level cars"} up to{" "}
          <strong>{dearest ? formatMoney(dearest.dailyRateSelfDrive) : "—"}</strong> for the{" "}
          {dearest ? `${dearest.make} ${dearest.model}` : "flagship cars"}. Every rate is shown on
          the vehicle&apos;s page — no hidden fees. Longer hires are discounted automatically:{" "}
          {config.weeklyDiscountPercent}% off from seven days and {config.monthlyDiscountPercent}%
          from twenty-eight.
        </>
      ),
    },
    {
      q: "What do I need to rent?",
      plain:
        "A valid driver's licence in your name, photo ID, and a payment card matching the licence. Additional drivers must be named on the agreement.",
      a: (
        <>
          A valid driver&apos;s licence held in your name and valid for the whole rental, photo ID,
          and a payment card in the same name for the security hold. Any additional driver must meet
          the same requirements and be named on the rental agreement before collection. Full detail
          is on the{" "}
          <Link href="/policies" className="text-accent underline">
            terms page
          </Link>
          .
        </>
      ),
    },
    {
      q: "How long can I rent for?",
      plain: `Minimum ${config.minRentalDays} day, with weekly and monthly rates for longer hires.`,
      a: (
        <>
          The minimum hire is {config.minRentalDays} day
          {config.minRentalDays === 1 ? "" : "s"}, and there is no practical maximum. Weekly and
          monthly rates apply automatically, so a fortnight costs noticeably less per day than a
          weekend.
        </>
      ),
    },
    {
      q: "Can I cancel or change my booking?",
      plain: `Free cancellation up to ${config.cancellationWindowHours} hours before collection; after that the deposit is forfeited.`,
      a: (
        <>
          Cancel free of charge up to <strong>{config.cancellationWindowHours} hours</strong> before
          collection and the deposit is refunded in full. Inside that window the deposit is
          forfeited. Date changes are free subject to availability — ask as early as you can, because
          the popular cars book out.
        </>
      ),
    },
    {
      q: "What's the difference between self-drive and chauffeur?",
      plain:
        "Self-drive books and confirms online instantly. Chauffeur trips are quoted and confirmed by our team with a named driver.",
      a: (
        <>
          Self-drive is booked and confirmed online in one go — you collect the keys and drive. A{" "}
          <Link href="/book/chauffeur" className="text-accent underline">
            chauffeur request
          </Link>{" "}
          is an enquiry: you send the trip details, we confirm the vehicle, assign a driver and set
          the final price before anything is charged. Not every car is offered with a driver.
        </>
      ),
    },
    {
      q: "How many cars are in the fleet?",
      plain: `${count} vehicles, from everyday sedans to exotics.`,
      a: (
        <>
          {count} vehicles at the moment, from everyday sedans through to the exotics. The{" "}
          <Link href="/vehicles" className="text-accent underline">
            fleet page
          </Link>{" "}
          always shows what is actually on the books — cars in for maintenance drop out of the list
          automatically.
        </>
      ),
    },
    {
      q: "What happens if the car is damaged?",
      plain:
        "Vehicles are inspected at collection and return. New damage is charged up to the excess on your rental agreement.",
      a: (
        <>
          Every car is inspected and photographed at collection and again at return. New damage is
          charged up to the insurance excess stated on your rental agreement. Traffic fines, tolls
          and parking charges during the hire are passed on with an administration fee.
        </>
      ),
    },
  ];

  // Rich result markup, generated from the same content shown on the page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.plain },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="hero-glow border-b border-line">
        <div className="container-page py-16">
          <p className="eyebrow">FAQ</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tighter text-balance sm:text-5xl">
            Everything you need to know before you book.
          </h1>
          <p className="mt-4 max-w-prose text-lg text-muted">
            Still stuck? {config.phone ? `Call ${config.phone} or ` : ""}send us a note and a person
            will answer.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="divide-y divide-line">
          {faqs.map((faq) => (
            <details key={faq.q} className="group py-5 [&[open]_svg]:rotate-45">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                <h2 className="text-lg font-semibold tracking-tight group-hover:text-accent">
                  {faq.q}
                </h2>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mt-1 h-5 w-5 shrink-0 text-accent transition-transform duration-200"
                  aria-hidden
                >
                  <path d="M9.25 4h1.5v5.25H16v1.5h-5.25V16h-1.5v-5.25H4v-1.5h5.25V4Z" />
                </svg>
              </summary>
              <div className="mt-3 max-w-prose text-muted">{faq.a}</div>
            </details>
          ))}
        </div>

        <aside className="card p-6 lg:sticky lg:top-28">
          <h2 className="font-semibold tracking-tight">Still have a question?</h2>
          <p className="mt-2 text-sm text-muted">
            Chauffeur trips, long-term hire and anything unusual — ask and we&apos;ll come back with
            a price.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/book/chauffeur" className="btn-primary">
              Send us a trip
            </Link>
            <Link href="/vehicles" className="btn-secondary">
              Check availability
            </Link>
            {config.phone ? (
              <a
                href={`tel:${config.phone.replace(/[^\d+]/g, "")}`}
                className="btn-secondary"
              >
                Call {config.phone}
              </a>
            ) : null}
          </div>
          <p className="hint mt-4">{config.openingHours}</p>
        </aside>
      </div>
    </>
  );
}
