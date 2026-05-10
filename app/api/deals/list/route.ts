import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseAdmin();

  const { data: deals, error } = await sb
    .from("deals")
    .select(
      "id, name, value, stage, health_score, health_reason, expected_close, risk_level, ai_summary, primary_contact_id, created_at, updated_at, company:companies(id, name, industry), primary_contact:contacts!deals_primary_contact_id_fkey(id, name, role, email)"
    )
    .order("health_score", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pull last activity per deal in one query.
  const dealIds = (deals ?? []).map((d) => (d as any).id);
  const { data: activities } = await sb
    .from("activities")
    .select("deal_id, created_at, type, subject, ai_summary")
    .in("deal_id", dealIds.length > 0 ? dealIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  const lastByDeal = new Map<string, any>();
  for (const a of (activities ?? []) as any[]) {
    if (!lastByDeal.has(a.deal_id)) lastByDeal.set(a.deal_id, a);
  }

  const now = Date.now();
  const result = ((deals ?? []) as any[]).map((d) => {
    const updated = new Date(d.updated_at).getTime();
    const days_in_stage = Math.max(0, Math.floor((now - updated) / (24 * 60 * 60 * 1000)));
    const last = lastByDeal.get(d.id);
    return {
      id: d.id,
      name: d.name,
      value: Number(d.value ?? 0),
      stage: d.stage,
      health_score: d.health_score,
      health_reason: d.health_reason,
      expected_close: d.expected_close,
      risk_level: d.risk_level,
      ai_summary: d.ai_summary,
      days_in_stage,
      last_activity_at: last?.created_at ?? null,
      last_activity_summary: last?.ai_summary ?? last?.subject ?? null,
      company: d.company ? { id: d.company.id, name: d.company.name, industry: d.company.industry } : null,
      primary_contact: d.primary_contact
        ? { id: d.primary_contact.id, name: d.primary_contact.name, role: d.primary_contact.role, email: d.primary_contact.email }
        : null,
    };
  });

  return NextResponse.json({ deals: result });
}
