import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Debug — returns only safe metadata about google_tokens rows.
 * Never returns access_token / refresh_token values.
 */
export async function GET() {
  const sb = supabaseAdmin();
  const { data, error, count } = await sb
    .from("google_tokens")
    .select("id, email, scope, created_at, expiry_date, access_token, refresh_token", { count: "exact" })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as any[];
  return NextResponse.json({
    count,
    rows: rows.map((r) => ({
      id: r.id,
      email: r.email,
      scope: r.scope,
      created_at: r.created_at,
      expiry_date: r.expiry_date,
      has_access_token: Boolean(r.access_token),
      has_refresh_token: Boolean(r.refresh_token),
    })),
  });
}
