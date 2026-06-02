import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "tvs2024";

export function middleware(request: NextRequest) {
  const authed = request.cookies.get("tvs_auth")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApi = request.nextUrl.pathname.startsWith("/api");

  // API routes bypass auth
  if (isApi) return NextResponse.next();

  // Not authed, redirect to login
  if (!authed || authed !== ACCESS_PASSWORD) {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Authed but on login page, redirect to home
  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
