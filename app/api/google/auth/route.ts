import { NextResponse } from "next/server";
import { newOAuthClient, GOOGLE_SCOPES } from "@/lib/google/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google OAuth not configured. Use Demo Mode in Settings instead." },
      { status: 503 }
    );
  }
  const client = newOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
  });
  return NextResponse.redirect(url);
}
