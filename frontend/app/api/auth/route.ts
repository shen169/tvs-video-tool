import { NextResponse } from "next/server";

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "tvs2024";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = formData.get("password")?.toString() || "";

  // Render 会设置 x-forwarded-host，用它获取真实域名
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const base = `${protocol}://${host}`;

  if (password === ACCESS_PASSWORD) {
    const response = NextResponse.redirect(new URL("/", base), 303);
    response.cookies.set("tvs_auth", ACCESS_PASSWORD, {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  }

  return NextResponse.redirect(new URL("/login?error=1", base), 303);
}
