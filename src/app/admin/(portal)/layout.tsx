import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BrandLockup } from "@/components/brand";
import { AdminNav } from "./nav";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const pendingRequests = await prisma.reservation.count({
    where: { type: "chauffeur", status: "pending" },
  });

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLockup href="/admin" showName={false} />
            <span className="badge bg-canvas text-muted ring-1 ring-line ring-inset">Admin</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">
              {session.name} · {session.role}
            </span>
            <Link href="/" className="hidden text-muted hover:text-ink sm:inline">
              View site
            </Link>
            <form action={logout}>
              <button type="submit" className="btn-secondary btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <AdminNav pendingRequests={pendingRequests} isOwner={session.role === "owner"} />
      </header>

      <main className="container-page flex-1 py-8">{children}</main>
    </div>
  );
}
