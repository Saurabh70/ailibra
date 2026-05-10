import { NextResponse } from "next/server";
import { DEMO_EMAIL } from "@/lib/google/tokens";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hasApollo, hasResend } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("google_tokens")
    .select("email, scope, access_token, refresh_token")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) console.error("status query error:", error.message);
  const row = ((data ?? []) as any[])[0] ?? null;
  const demo = row?.email === DEMO_EMAIL;
  return NextResponse.json({
    google: {
      connected: Boolean(row?.refresh_token),
      email: row?.email ?? null,
      scope: row?.scope ?? null,
      demo,
    },
    integrations: {
      apollo: hasApollo(),
      resend: hasResend(),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    },
  });
}
