"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession } from "@/lib/auth";
import { guard } from "@/lib/rate-limit";
import { BookingError } from "@/lib/availability";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  let next = "/admin";

  try {
    // Brute-force protection (PRD §7.3).
    await guard("login", 8, 5 * 60_000);

    const parsed = loginSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Enter your email address and password." };

    const user = await authenticate(parsed.data.email, parsed.data.password);
    if (!user) return { error: "Those details don't match an active account." };

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const requested = String(formData.get("next") ?? "");
    // Only same-site paths, so a crafted link cannot bounce a signed-in admin
    // off to another host.
    if (requested.startsWith("/admin")) next = requested;
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };
    console.error("[admin:login]", error);
    return { error: "Could not sign you in. Please try again." };
  }

  redirect(next);
}
