import Link from "next/link";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { BrandLockup } from "@/components/brand";

const FLEET_LINKS = [
  { href: "/vehicles", label: "All vehicles" },
  { href: "/vehicles?category=luxury", label: "Luxury & exotic" },
  { href: "/vehicles?category=suv", label: "SUVs" },
  { href: "/vehicles?category=sedan", label: "Sedans" },
  { href: "/vehicles?sort=price_asc", label: "Best value" },
];

const COMPANY_LINKS = [
  { href: "/book/chauffeur", label: "Chauffeur hire" },
  { href: "/faq", label: "FAQ" },
  { href: "/policies", label: "Terms & cancellation" },
  { href: "/policies#damage", label: "Damage policy" },
  { href: "/admin", label: "Staff login" },
];

/** CSS-only dropdown: no JavaScript, keyboard reachable, closes on blur. */
function NavMenu({ label, links }: { label: string; links: typeof FLEET_LINKS }) {
  return (
    <div className="group relative hidden sm:block">
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-muted transition-colors hover:bg-canvas hover:text-ink group-focus-within:text-ink"
        aria-haspopup="true"
      >
        {label}
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
          <path d="M5.2 7.5 10 12.3l4.8-4.8 1.2 1.2-6 6-6-6 1.2-1.2Z" />
        </svg>
      </button>
      <div
        className="invisible absolute left-0 top-full z-30 w-56 pt-2 opacity-0 transition-all
                   group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        <ul className="card overflow-hidden p-1.5 shadow-(--shadow-lift)">
          {links.map((link) => (
            <li key={link.href + link.label}>
              <Link
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-brand-soft hover:text-ink"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export async function SiteHeader() {
  const telHref = config.phone ? `tel:${config.phone.replace(/[^\d+]/g, "")}` : null;

  // Signed-in staff get a way back into the portal. This verifies the token's
  // signature and expiry — the same check the admin routes themselves run — so
  // a forged or stale cookie shows nothing. It gates a link, not access:
  // /admin is protected independently in middleware, the portal layout and
  // every server action.
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-xl">
      {/* Utility strip — hours and contact, the way rental sites lead with them. */}
      <div className="hidden border-b border-line bg-canvas text-muted sm:block">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-xs">
          <p>{config.openingHours}</p>
          <div className="flex items-center gap-4">
            {config.address ? <span className="hidden lg:inline">{config.address}</span> : null}
            {config.email ? (
              <a href={`mailto:${config.email}`} className="hover:text-brand">
                {config.email}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container-page flex h-16 items-center justify-between gap-4">
        <BrandLockup />

        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
          <NavMenu label="Fleet" links={FLEET_LINKS} />
          <Link
            href="/book/chauffeur"
            className="rounded-lg px-3 py-2 text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            Chauffeur
          </Link>
          <Link
            href="/faq"
            className="hidden rounded-lg px-3 py-2 text-muted transition-colors hover:bg-canvas hover:text-ink md:block"
          >
            FAQ
          </Link>
          <Link
            href="/policies"
            className="hidden rounded-lg px-3 py-2 text-muted transition-colors hover:bg-canvas hover:text-ink lg:block"
          >
            Terms
          </Link>
          {telHref ? (
            <a href={telHref} className="btn-secondary btn-sm ml-1 hidden sm:inline-flex">
              {config.phone}
            </a>
          ) : null}

          {session ? (
            <Link
              href="/admin"
              className="btn-secondary btn-sm ml-1 border-brand/40 text-accent"
              title={`Signed in as ${session.name || session.email} (${session.role})`}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-brand shadow-(--shadow-glow)"
              />
              <span className="hidden lg:inline">Admin dashboard</span>
              <span className="lg:hidden">Admin</span>
            </Link>
          ) : null}

          <Link href="/vehicles" className="btn-primary btn-sm ml-1">
            Book now
          </Link>
        </nav>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const telHref = config.phone ? `tel:${config.phone.replace(/[^\d+]/g, "")}` : null;

  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  const staffLabel = session ? "Admin dashboard" : "Staff login";
  const companyLinks = COMPANY_LINKS.map((link) =>
    link.href === "/admin" ? { ...link, label: staffLabel } : link,
  );

  return (
    <footer className="mt-20 border-t border-line bg-surface text-muted">
      <div className="rule-accent" />
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandLockup />
          <p className="mt-4 max-w-xs text-sm">
            Self-drive rentals and chauffeur-driven trips, from everyday sedans to the exotics.
            Booked online, confirmed in minutes.
          </p>
          {config.instagram ? (
            <a
              href={`https://instagram.com/${config.instagram.replace("@", "")}`}
              className="mt-4 inline-block text-sm font-medium text-brand hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {config.instagram}
            </a>
          ) : null}
        </div>

        <FooterGroup title="Fleet" links={FLEET_LINKS} />
        <FooterGroup title="Company" links={companyLinks} />

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">Contact</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {telHref ? (
              <li>
                <a href={telHref} className="hover:text-brand">
                  {config.phone}
                </a>
              </li>
            ) : null}
            {config.email ? (
              <li>
                <a href={`mailto:${config.email}`} className="hover:text-brand">
                  {config.email}
                </a>
              </li>
            ) : null}
            {config.address ? <li>{config.address}</li> : null}
            <li>{config.openingHours}</li>
          </ul>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-[0.12em] text-ink">
            Requirements
          </h2>
          <ul className="mt-4 space-y-1.5 text-sm">
            <li>Valid driver&apos;s licence</li>
            <li>Photo ID and matching payment card</li>
            <li>
              {config.minRentalDays} day minimum · {config.selfDriveDepositPercent}% deposit
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {config.businessName}. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link href="/policies" className="hover:text-brand">
              Terms & cancellation
            </Link>
            <Link href="/policies#privacy" className="hover:text-brand">
              Privacy
            </Link>
            <Link href="/faq" className="hover:text-brand">
              FAQ
            </Link>
            <Link href="/admin" className="hover:text-brand">
              {staffLabel}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: typeof FLEET_LINKS }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="hover:text-brand">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
