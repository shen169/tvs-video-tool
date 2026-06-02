import { NextResponse } from "next/server";

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "tvs2024";

export async function POST(request: Request) {
  const { password } = await request.json();
  if (password === ACCESS_PASSWORD) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("tvs_auth", ACCESS_PASSWORD, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }
  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
