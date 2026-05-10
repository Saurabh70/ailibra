import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseAdmin();
  const id = params.id;

  const [contactRes, activitiesRes, dealsRes] = await Promise.all([
    sb
      .from("contacts")
      .select(
        "id, company_id, name, role, email, phone, linkedin, avatar_url, relationship_summary, last_interaction, sentiment, engagement_score, source, enriched_at, created_at, company:companies(id, name, industry, size, website, linkedin)"
      )
      .eq("id", id)
      .single(),

    sb
      .from("activities")
      .select(
        "id, type, subject, content, ai_summary, sentiment, source, metadata, created_at, deal:deals(id, name, stage, value)"
      )
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(40),

    sb
      .from("deals")
      .select("id, name, value, stage, health_score, expected_close")
      .eq("primary_contact_id", id),
  ]);

  const cAny = contactRes as any;
  if (cAny.error || !cAny.data) {
    return NextResponse.json({ error: cAny.error?.message ?? "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    contact: cAny.data,
    activities: (activitiesRes as any).data ?? [],
    deals: (dealsRes as any).data ?? [],
  });
}
