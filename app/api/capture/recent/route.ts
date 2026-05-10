import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [activitiesRes, tasksRes, dealsRes] = await Promise.all([
    sb
      .from("activities")
      .select(
        "id, type, subject, content, ai_summary, sentiment, source, created_at, deal:deals(id, name, company:companies(name)), contact:contacts(id, name, role)"
      )
      .gte("created_at", since)
      .eq("source", "manual")
      .order("created_at", { ascending: false })
      .limit(20),

    sb
      .from("tasks")
      .select("id, description, due_date, priority, status, ai_generated, created_at, deal:deals(name)")
      .gte("created_at", since)
      .eq("ai_generated", true)
      .order("created_at", { ascending: false })
      .limit(20),

    sb
      .from("deals")
      .select(
        "id, name, value, stage, created_at, updated_at, company:companies(name), primary_contact:contacts!deals_primary_contact_id_fkey(name)"
      )
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    activities: ((activitiesRes as any).data ?? []) as any[],
    tasks: ((tasksRes as any).data ?? []) as any[],
    deals: ((dealsRes as any).data ?? []) as any[],
  });
}
