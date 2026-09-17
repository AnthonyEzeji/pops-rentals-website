import type { Metadata } from "next";
import { BrandLockup } from "@/components/brand";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const next = typeof query.next === "string" ? query.next : "/admin";

  return (
    <main className="hero-glow flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandLockup size={40} />
        </div>

        <div className="card p-6 shadow-(--shadow-lift)">
          <h1 className="text-lg font-semibold tracking-tight">Staff sign in</h1>
          <p className="mt-1 text-sm text-muted">The admin portal is for staff and owners only.</p>
          <div className="mt-6">
            <LoginForm next={next} />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Lost your password? Ask the owner to reset it from the staff list.
        </p>
      </div>
    </main>
  );
}
