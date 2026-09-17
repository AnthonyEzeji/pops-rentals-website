import "server-only";
import { headers } from "next/headers";
import { BookingError } from "./availability";

/**
 * In-process fixed-window limiter for booking, request and login endpoints
 * (PRD §7.3). Good enough for a single instance; swap for Upstash/Redis when
 * the app runs on more than one node.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function clientKey(scope: string) {
  const store = await headers();
  const ip =
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    store.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) sweep(now);
    return { ok: true as const, remaining: limit - 1 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false as const,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { ok: true as const, remaining: limit - bucket.count };
}

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export async function guard(scope: string, limit: number, windowMs: number) {
  const result = rateLimit(await clientKey(scope), limit, windowMs);
  if (!result.ok) {
    throw new BookingError(
      "rate_limited",
      `Too many attempts. Please try again in ${result.retryAfterSeconds} seconds.`,
    );
  }
}
