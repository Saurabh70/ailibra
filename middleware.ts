import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cookie-based auth gate.
 * - /login, /api/auth/*, /api/google/auth, /api/google/callback are public.
 * - Everything else requires the ailibra_session cookie matching LOGIN_EMAIL.
 *
 * On localhost we still gate (so the login UX can be tested), but the
 * developer can disable with ALLOW_LOCAL_NOAUTH=1 if desired.
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Always allow these paths through.
  const publicPath =
    path === "/login" ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/api/google/auth") ||
    path.startsWith("/api/google/callback") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico";
  if (publicPath) return NextResponse.next();

  const session = req.cookies.get("ailibra_session")?.value ?? "";
  const expected = process.env.LOGIN_EMAIL?.toLowerCase() ?? "saurabh@gmail.com";
  if (session.trim().toLowerCase() === expected) {
    return NextResponse.next();
  }

  // For API routes, return 401 JSON.
  if (path.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // For pages, redirect to /login with `next` param so we bounce back after login.
  const loginUrl = new URL("/login", req.url);
  if (path !== "/") loginUrl.searchParams.set("next", path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
