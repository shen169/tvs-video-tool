import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "tvs2024";

export function middleware(request: NextRequest) {
  const authed = request.cookies.get("tvs_auth")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApi = request.nextUrl.pathname.startsWith("/api");

  // API routes bypass auth
  if (isApi) return NextResponse.next();

  // 用 x-forwarded-host 避免 localhost 重定向
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const base = `${proto}://${host}`;

  // Not authed, redirect to login
  if (!authed || authed !== ACCESS_PASSWORD) {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL("/login", base), 303);
    }
    return NextResponse.next();
  }

  // Authed but on login page, redirect to home
  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", base), 303);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
