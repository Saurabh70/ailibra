import { NextResponse } from "next/server";
import { serverEnv_ } from "@/lib/env";

export const runtime = "nodejs";

const COOKIE_NAME = "ailibra_session";

export async function POST(req: Request) {
  const env = serverEnv_();
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "email + password required" }, { status: 400 });
  }
  const okEmail = email.trim().toLowerCase() === env.LOGIN_EMAIL.toLowerCase();
  const okPass = password === env.LOGIN_PASSWORD;
  if (!okEmail || !okPass) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, email });
  // Session cookie (no maxAge → cleared on browser close → triggers intro on each login).
  res.cookies.set({
    name: COOKIE_NAME,
    value: email.toLowerCase(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
