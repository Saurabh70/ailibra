import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const sb = supabaseAdmin();
  // First fetch ids, then delete by in-list. PostgREST is fussy about
  // unbounded deletes; this form always works.
  const { data: rows, error: selErr } = await sb.from("google_tokens").select("id");
  if (selErr) {
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
  }
  const ids = ((rows ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }
  const { error: delErr } = await sb.from("google_tokens").delete().in("id", ids);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: ids.length });
}
