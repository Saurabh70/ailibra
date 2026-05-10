import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseAdmin();
  const id = params.id;

  const [dealRes, activitiesRes, tasksRes] = await Promise.all([
    sb
      .from("deals")
      .select(
        "id, name, value, stage, health_score, health_reason, expected_close, risk_level, ai_summary, primary_contact_id, created_at, updated_at, company:companies(id, name, industry, size, website, linkedin), primary_contact:contacts!deals_primary_contact_id_fkey(id, name, role, email, phone, linkedin)"
      )
      .eq("id", id)
      .single(),

    sb
      .from("activities")
      .select(
        "id, type, subject, content, ai_summary, sentiment, source, metadata, created_at, contact:contacts(id, name, role)"
      )
      .eq("deal_id", id)
      .order("created_at", { ascending: false })
      .limit(60),

    sb
      .from("tasks")
      .select("id, description, due_date, priority, status, ai_generated, created_at")
      .eq("deal_id", id)
      .order("due_date", { ascending: true }),
  ]);

  const dAny = dealRes as any;
  if (dAny.error || !dAny.data) {
    return NextResponse.json({ error: dAny.error?.message ?? "Not found" }, { status: 404 });
  }
  const deal = dAny.data;
  const activities = ((activitiesRes as any).data ?? []) as any[];

  // Fetch all contacts at the same company.
  let contacts: any[] = [];
  if (deal.company?.id) {
    const { data } = await sb
      .from("contacts")
      .select("id, name, role, email, phone, linkedin, sentiment, engagement_score, last_interaction")
      .eq("company_id", deal.company.id)
      .order("engagement_score", { ascending: false });
    contacts = (data ?? []) as any[];
  }

  // ─── deterministic health breakdown ─────────────────────
  const now = Date.now();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const recent = activities.filter((a) => now - new Date(a.created_at).getTime() < fourteenDaysMs);
  const recentEmails = recent.filter((a) => a.type === "email").length;
  const distinctContacts = new Set(recent.map((a) => a.contact?.id).filter(Boolean)).size;

  // response time: average gap between consecutive activities (proxy)
  let responseScore = 60;
  if (recent.length >= 2) {
    const sorted = [...recent].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(
        (new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime()) /
          (24 * 60 * 60 * 1000)
      );
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    responseScore = Math.max(0, Math.min(100, Math.round(100 - avgGap * 14)));
  }

  const updatedAt = new Date(deal.updated_at).getTime();
  const stageDays = Math.max(0, Math.floor((now - updatedAt) / (24 * 60 * 60 * 1000)));
  const stageScore = Math.max(0, Math.min(100, Math.round(100 - (stageDays / 90) * 100)));

  const health_metrics = {
    email_velocity: Math.min(100, recentEmails * 20), // 5 emails = 100
    stakeholder_engagement: Math.min(100, distinctContacts * 25), // 4 contacts = 100
    response_time: responseScore,
    stage_duration: stageScore,
  };

  return NextResponse.json({
    deal,
    activities,
    contacts,
    tasks: (tasksRes as any).data ?? [],
    health_metrics,
    days_in_stage: stageDays,
  });
}
