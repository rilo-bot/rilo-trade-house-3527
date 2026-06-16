import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Edge guard for protected routes (Next.js 16 renamed `middleware` → `proxy`).
 *
 * This is a fast, optimistic check for the presence of a session cookie only —
 * it does NOT verify the session or the user's role (no DB access at the edge).
 * Fine-grained role checks happen in the page/route via `requireRole()` from
 * lib/auth/guards.ts.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/account"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: "treadhouse",
  });

  if (!sessionCookie) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/account/:path*"],
};
