import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "tvs2024";

export function middleware(request: NextRequest) {
  const authed = request.cookies.get("tvs_auth")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApi = request.nextUrl.pathname.startsWith("/api");

  // API routes bypass auth
  if (isApi) return NextResponse.next();

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const base = `${proto}://${host}`;

  // JWT 登录的用户（前端 login/register 成功后设置此 cookie）
  const jwtAuthed = request.cookies.get("tvs_authed")?.value === "1";

  // 有密码 cookie 或 JWT 标记 → 通过
  if ((authed && authed === ACCESS_PASSWORD) || jwtAuthed) {
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/", base), 303);
    }
    return NextResponse.next();
  }

  // 未认证 → 跳登录
  if (!isLoginPage) {
    return NextResponse.redirect(new URL("/login", base), 303);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
