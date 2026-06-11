import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "tvs2024";

export function middleware(request: NextRequest) {
  const authed = request.cookies.get("tvs_auth")?.value;
  const jwtAuthed = request.cookies.get("tvs_authed")?.value === "1";
  const isLoggedIn = (authed && authed === ACCESS_PASSWORD) || jwtAuthed;

  const pathname = request.nextUrl.pathname;
  const isHomePage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const isApi = pathname.startsWith("/api");

  // API routes bypass
  if (isApi) return NextResponse.next();

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const base = `${proto}://${host}`;

  // Landing page — public, no auth required
  if (isHomePage) {
    // Logged-in users → redirect to app
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/app", base), 303);
    }
    return NextResponse.next();
  }

  // Login page — public
  if (isLoginPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/app", base), 303);
    }
    return NextResponse.next();
  }

  // All other pages — auth required
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", base), 303);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
