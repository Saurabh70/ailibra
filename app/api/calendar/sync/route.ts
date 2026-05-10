import { NextResponse } from "next/server";
import { listUpcoming } from "@/lib/google/calendar";
import { isDemoMode, isGoogleConnected } from "@/lib/google/tokens";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;

const DEMO_EVENTS = [
  {
    summary: "Group demo with Razorpay merchant ops",
    description: "Demo for 8 reps + Priya. Walking through AI capture + auto-logging.",
    hours_from_now: 17,
    duration_min: 45,
    contact_email_part: "priya@razorpay.com",
    location: "https://meet.google.com/abc-defg-hij",
  },
  {
    summary: "Final pricing + signature review",
    description: "Pricing lock-in with Vikram + Zerodha legal.",
    hours_from_now: 23,
    duration_min: 30,
    contact_email_part: "vikram@zerodha.com",
    location: "Zoom",
  },
  {
    summary: "Proposal walkthrough with Divya",
    description: "Walking Divya through the proposal line-by-line.",
    hours_from_now: 43,
    duration_min: 60,
    contact_email_part: "divya@swiggy.com",
    location: "https://meet.google.com/swg-prop-walk",
  },
];

export async function POST() {
  if (!(await isGoogleConnected())) {
    return NextResponse.json({ error: "Google not connected" }, { status: 401 });
  }

  const sb = supabaseAdmin();

  if (await isDemoMode()) {
    // Idempotent: replace existing demo upcoming meetings.
    // (We re-anchor scheduled_for to "now + N hours" each time.)
    const { data: contactsRaw } = await sb.from("contacts").select("id, email, company_id");
    const contacts = ((contactsRaw ?? []) as any[]).filter((c) => c.email);
    const byEmail = new Map<string, any>();
    for (const c of contacts) byEmail.set(c.email.toLowerCase(), c);

    const { data: dealsRaw } = await sb
      .from("deals")
      .select("id, primary_contact_id, company_id")
      .not("stage", "in", "(closed_won,closed_lost)");
    const dealsByContact = new Map<string, string>();
    for (const d of (dealsRaw ?? []) as any[]) {
      if (d.primary_contact_id) dealsByContact.set(d.primary_contact_id, d.id);
    }

    let inserted = 0;
    let skipped = 0;

    for (const ev of DEMO_EVENTS) {
      const contact = byEmail.get(ev.contact_email_part.toLowerCase());
      if (!contact) {
        skipped++;
        continue;
      }
      const dealId = dealsByContact.get(contact.id) ?? null;
      const start = new Date(Date.now() + ev.hours_from_now * HOUR_MS).toISOString();
      const demoId = `demo-event:${ev.contact_email_part}:${ev.summary}`;

      // Dedup: search for an activity with this demo_id.
      const { data: existing } = await sb
        .from("activities")
        .select("id")
        .eq("source", "calendar")
        .filter("metadata->>demo_id", "eq", demoId)
        .limit(1);
      if ((existing ?? []).length > 0) {
        // Update scheduled_for so the demo is always in the future.
        const id = (existing as any[])[0].id;
        await sb
          .from("activities")
          .update({
            metadata: {
              demo_id: demoId,
              scheduled_for: start,
              duration_min: ev.duration_min,
              attendees: [ev.contact_email_part, "you@ailibra.local"],
              location: ev.location,
              is_demo: true,
            },
          } as never)
          .eq("id", id);
        skipped++;
        continue;
      }

      const insert: Record<string, unknown> = {
        type: "meeting",
        subject: ev.summary,
        content: ev.description,
        sentiment: "neutral",
        source: "calendar",
        deal_id: dealId,
        contact_id: contact.id,
        metadata: {
          demo_id: demoId,
          scheduled_for: start,
          duration_min: ev.duration_min,
          attendees: [ev.contact_email_part, "you@ailibra.local"],
          location: ev.location,
          is_demo: true,
        },
      };
      const { error } = await sb.from("activities").insert(insert as never);
      if (!error) inserted++;
    }

    return NextResponse.json({ demo: true, total: DEMO_EVENTS.length, inserted, refreshed: skipped });
  }

  // Real path.
  let events;
  try {
    events = await listUpcoming(48);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "calendar list failed" },
      { status: 500 }
    );
  }

  // Match attendees → contacts → deal.
  const { data: contactsRaw } = await sb.from("contacts").select("id, email, company_id");
  const contacts = ((contactsRaw ?? []) as any[]).filter((c) => c.email);
  const byEmail = new Map<string, any>();
  for (const c of contacts) byEmail.set(c.email.toLowerCase(), c);

  const { data: dealsRaw } = await sb
    .from("deals")
    .select("id, primary_contact_id, company_id")
    .not("stage", "in", "(closed_won,closed_lost)");
  const dealsByContact = new Map<string, string>();
  const dealsByCompany = new Map<string, string>();
  for (const d of (dealsRaw ?? []) as any[]) {
    if (d.primary_contact_id) dealsByContact.set(d.primary_contact_id, d.id);
    if (d.company_id && !dealsByCompany.has(d.company_id)) dealsByCompany.set(d.company_id, d.id);
  }

  let inserted = 0;
  let skipped = 0;

  for (const ev of events) {
    // Pick the first attendee that matches a contact.
    const contact = ev.attendees.map((a) => byEmail.get(a.toLowerCase())).find(Boolean);
    if (!contact) {
      skipped++;
      continue;
    }
    const dealId = dealsByContact.get(contact.id) ?? dealsByCompany.get(contact.company_id) ?? null;

    // Dedup by gcal id.
    const { data: existing } = await sb
      .from("activities")
      .select("id")
      .eq("source", "calendar")
      .filter("metadata->>gcal_id", "eq", ev.id)
      .limit(1);
    if ((existing ?? []).length > 0) {
      skipped++;
      continue;
    }

    const insert: Record<string, unknown> = {
      type: "meeting",
      subject: ev.summary,
      content: ev.description,
      sentiment: "neutral",
      source: "calendar",
      deal_id: dealId,
      contact_id: contact.id,
      metadata: {
        gcal_id: ev.id,
        scheduled_for: ev.start,
        location: ev.location ?? ev.hangout_link,
        attendees: ev.attendees,
      },
    };
    const { error } = await sb.from("activities").insert(insert as never);
    if (!error) inserted++;
  }

  return NextResponse.json({ demo: false, total: events.length, inserted, skipped_existing: skipped });
}
