import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Site-wide lock.
 *
 * With SITE_LOCKED=true every route — public pages, the admin portal and the
 * API — answers 404, as if the deployment did not exist. Nothing is deleted:
 * the code, the database and the uploaded photos are untouched, so clearing the
 * variable restores the site exactly as it was.
 *
 * SITE_UNLOCK_KEY lets you through while it is locked. Visit any page with
 * ?access=<key> once; the key is stored in a cookie and the lock is bypassed on
 * that browser from then on.
 */
const UNLOCK_COOKIE = "site_access";
const UNLOCK_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function lockResponse(request: NextRequest) {
  // Rewriting to a path that does not exist renders the app's own 404 page with
  // a genuine 404 status, rather than an error that hints something is hidden.
  return NextResponse.rewrite(new URL("/_site-locked", request.url), { status: 404 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.SITE_LOCKED === "true") {
    const key = process.env.SITE_UNLOCK_KEY;
    const provided = request.nextUrl.searchParams.get("access");
    const stored = request.cookies.get(UNLOCK_COOKIE)?.value;

    // First visit with the key: remember it, then drop it from the URL so it is
    // not left in history, screenshots or the referrer header.
    if (key && provided === key) {
      const clean = new URL(request.nextUrl);
      clean.searchParams.delete("access");
      const response = NextResponse.redirect(clean);
      response.cookies.set(UNLOCK_COOKIE, key, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: UNLOCK_MAX_AGE,
      });
      return response;
    }

    if (!key || stored !== key) return lockResponse(request);
  }

  // Everything below is the normal admin guard.
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/admin/login") {
    if (session) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except the build assets the 404 page itself needs to render.
  // `_next/image` is deliberately not exempt: it would serve vehicle photos.
  matcher: ["/((?!_next/static|favicon.ico).*)"],
};
