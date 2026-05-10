import { NextResponse } from "next/server";
import { saveTokenRow, disconnectGoogle, DEMO_EMAIL } from "@/lib/google/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sets up a demo-mode token row. Sync + send routes detect the sentinel
 * email and use mocked behavior (no real Google API calls). Useful when
 * real OAuth is blocked (e.g. unverified app).
 */
export async function POST() {
  // Wipe any existing row first so we don't leave a real connection lying around.
  await disconnectGoogle();
  await saveTokenRow({
    access_token: "DEMO_TOKEN",
    refresh_token: "DEMO_REFRESH",
    expiry_date: Date.now() + 365 * 24 * 60 * 60 * 1000,
    email: DEMO_EMAIL,
    scope: "demo",
  });
  return NextResponse.json({ ok: true, demo: true });
}
