"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/maintenance", label: "Maintenance" },
  { href: "/admin/expenses", label: "Expenses" },
  { href: "/admin/reports", label: "Reports", ownerOnly: true },
];

export function AdminNav({
  pendingRequests,
  isOwner,
}: {
  pendingRequests: number;
  isOwner: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="container-page -mb-px flex gap-1 overflow-x-auto">
      {LINKS.filter((link) => isOwner || !link.ownerOnly).map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              active
                ? "border-brand text-accent"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {link.label}
            {link.href === "/admin/requests" && pendingRequests > 0 ? (
              <span className="badge ml-2 bg-warn-soft text-warn ring-1 ring-warn/30 ring-inset">
                {pendingRequests}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
