import { NextResponse } from "next/server";
import { newOAuthClient, GOOGLE_SCOPES } from "@/lib/google/client";

export const runtime = "nodejs";

export async function GET() {
  const client = newOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh_token on first connect
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
  });
  return NextResponse.redirect(url);
}
