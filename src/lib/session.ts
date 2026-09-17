import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "fleet_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // one working day

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: "owner" | "staff";
};

/** Placeholders that must never sign a real session. */
const WEAK_SECRET = /change[-_ ]?me|dev[-_ ]?only|placeholder|secret123|^test/i;

function secret() {
  const value = process.env.SESSION_SECRET;

  if (!value || value.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short — see .env.example");
  }

  // Anyone holding this string can mint an admin session, so a deployed app
  // refuses to start on a known placeholder or a short secret. Local dev is
  // only warned, so the checked-in example value keeps working.
  const deployed = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
  if (deployed && (WEAK_SECRET.test(value) || value.length < 32)) {
    throw new Error(
      "SESSION_SECRET is a placeholder or under 32 characters. Generate a real one:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"',
    );
  }
  if (!deployed && WEAK_SECRET.test(value)) {
    console.warn("[auth] Using a placeholder SESSION_SECRET — fine locally, never in production.");
  }

  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret());
}

/** Edge-safe: used by middleware as well as server components. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role === "owner" ? "owner" : "staff",
    };
  } catch {
    return null;
  }
}
