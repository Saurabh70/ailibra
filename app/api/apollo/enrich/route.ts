import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hasApollo } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { contact_id: string };

const TITLES = ["VP Sales", "Director of Marketing", "CTO", "Head of Operations", "VP Engineering", "Founder"];
const SOCIAL = (name: string) => "https://linkedin.com/in/" + name.toLowerCase().replace(/\s+/g, "-");
function fakePhone(): string {
  const a = 90000 + Math.floor(Math.random() * 9999);
  const b = 1000 + Math.floor(Math.random() * 9999);
  return `+91 ${a} ${String(b).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  const { contact_id } = (await req.json()) as Body;
  if (!contact_id) return NextResponse.json({ error: "contact_id required" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: cRaw, error } = await sb
    .from("contacts")
    .select("id, name, role, email, phone, linkedin, enriched_at, company:companies(name, website)")
    .eq("id", contact_id)
    .single();
  if (error || !cRaw) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  }
  const contact = cRaw as any;

  const useReal = hasApollo();
  // 30-day cache freshness gate.
  if (contact.enriched_at) {
    const days = (Date.now() - new Date(contact.enriched_at).getTime()) / (24 * 3600 * 1000);
    if (days < 30) {
      return NextResponse.json({
        ok: true,
        cached: true,
        demo: !useReal,
        contact: { role: contact.role, email: contact.email, phone: contact.phone, linkedin: contact.linkedin },
      });
    }
  }

  let role = contact.role;
  let email = contact.email;
  let phone = contact.phone;
  let linkedin = contact.linkedin;
  let demo = false;

  if (!useReal) {
    // Demo path: fill anything missing with plausible fakes.
    demo = true;
    if (!role) role = TITLES[Math.floor(Math.random() * TITLES.length)];
    if (!email && contact.company?.website) {
      const slug = contact.name.toLowerCase().split(" ")[0];
      const domain = (contact.company.website as string).replace(/^https?:\/\//, "").replace(/\/$/, "");
      email = `${slug}@${domain}`;
    }
    if (!phone) phone = fakePhone();
    if (!linkedin) linkedin = SOCIAL(contact.name);
  } else {
    // Real Apollo enrichment.
    try {
      const apiKey = process.env.APOLLO_API_KEY;
      const r = await fetch("https://api.apollo.io/v1/people/match", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey ?? "" },
        body: JSON.stringify({
          name: contact.name,
          organization_name: contact.company?.name,
          email: contact.email ?? undefined,
        }),
      });
      const data = await r.json();
      const p = data?.person;
      if (p) {
        if (p.title && !role) role = p.title;
        if (p.email && !email) email = p.email;
        if (p.phone_number && !phone) phone = p.phone_number;
        if (p.linkedin_url && !linkedin) linkedin = p.linkedin_url;
      }
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "apollo failed" },
        { status: 500 }
      );
    }
  }

  // Persist.
  const update: Record<string, unknown> = {
    enriched_at: new Date().toISOString(),
  };
  if (role && !contact.role) update.role = role;
  if (email && !contact.email) update.email = email;
  if (phone && !contact.phone) update.phone = phone;
  if (linkedin && !contact.linkedin) update.linkedin = linkedin;

  if (Object.keys(update).length > 1) {
    await sb.from("contacts").update(update as never).eq("id", contact_id);
  }

  return NextResponse.json({
    ok: true,
    cached: false,
    demo,
    contact: { role, email, phone, linkedin },
  });
}
