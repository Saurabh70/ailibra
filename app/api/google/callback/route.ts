import { NextResponse } from "next/server";
import { google } from "googleapis";
import { newOAuthClient } from "@/lib/google/client";
import { saveTokenRow } from "@/lib/google/tokens";
import { publicEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${publicEnv.NEXT_PUBLIC_APP_URL}/settings?google_error=${encodeURIComponent(error)}`
    );
  }
  if (!code) {
    return NextResponse.redirect(`${publicEnv.NEXT_PUBLIC_APP_URL}/settings?google_error=no_code`);
  }

  try {
    const client = newOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) throw new Error("No access_token returned");

    // Get the connected user's email for display.
    let email: string | null = null;
    try {
      client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const me = await oauth2.userinfo.get();
      email = me.data.email ?? null;
    } catch (err) {
      console.warn("userinfo fetch failed:", err);
    }

    await saveTokenRow({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      email,
      scope: tokens.scope,
    });

    return NextResponse.redirect(`${publicEnv.NEXT_PUBLIC_APP_URL}/settings?google_connected=1`);
  } catch (err) {
    console.error("google callback failed:", err);
    return NextResponse.redirect(
      `${publicEnv.NEXT_PUBLIC_APP_URL}/settings?google_error=${encodeURIComponent(
        err instanceof Error ? err.message : "callback_failed"
      )}`
    );
  }
}
