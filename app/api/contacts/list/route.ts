import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseAdmin();

  const [companiesRes, contactsRes] = await Promise.all([
    sb.from("companies").select("id, name, industry, size, health_score").order("name"),
    sb
      .from("contacts")
      .select(
        "id, company_id, name, role, email, phone, linkedin, avatar_url, last_interaction, sentiment, engagement_score, source"
      )
      .order("engagement_score", { ascending: false }),
  ]);

  if (companiesRes.error) return NextResponse.json({ error: companiesRes.error.message }, { status: 500 });
  if (contactsRes.error) return NextResponse.json({ error: contactsRes.error.message }, { status: 500 });

  const contacts = (contactsRes.data ?? []) as any[];
  const companies = (companiesRes.data ?? []) as any[];

  const grouped = companies.map((c) => ({
    ...c,
    contacts: contacts.filter((p) => p.company_id === c.id),
  }));

  return NextResponse.json({ companies: grouped });
}
