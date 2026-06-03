import { NextResponse } from "next/server";

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "tvs2024";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = formData.get("password")?.toString() || "";

  if (password === ACCESS_PASSWORD) {
    const response = NextResponse.redirect(new URL("/", request.url), 303);
    response.cookies.set("tvs_auth", ACCESS_PASSWORD, {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  }

  // 密码错误，重定向回登录页
  return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
}
