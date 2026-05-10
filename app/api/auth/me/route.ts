import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverEnv_ } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = serverEnv_();
  const session = cookies().get("ailibra_session")?.value ?? "";
  const authed = session.trim().toLowerCase() === env.LOGIN_EMAIL.toLowerCase();
  return NextResponse.json({ authed, email: authed ? session : null });
}
