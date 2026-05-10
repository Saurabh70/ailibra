import { NextResponse } from "next/server";
import { createEvent } from "@/lib/google/calendar";
import { isDemoMode, isGoogleConnected } from "@/lib/google/tokens";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  title: string;
  description?: string;
  start: string; // ISO
  duration_min?: number;
  attendees: string[];
  deal_id?: string;
  contact_id?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.title || !body.start) {
    return NextResponse.json({ error: "title and start required" }, { status: 400 });
  }
  if (!(await isGoogleConnected())) {
    return NextResponse.json({ error: "Google not connected" }, { status: 401 });
  }

  const startMs = new Date(body.start).getTime();
  const endMs = startMs + (body.duration_min ?? 30) * 60 * 1000;
  const start = new Date(startMs).toISOString();
  const end = new Date(endMs).toISOString();

  const sb = supabaseAdmin();
  const demo = await isDemoMode();

  let eventId = "";
  let htmlLink: string | null = null;
  let meetLink: string | null = null;

  if (!demo) {
    try {
      const ev = await createEvent({
        summary: body.title,
        description: body.description,
        start,
        end,
        attendees: body.attendees,
      });
      eventId = ev.id;
      htmlLink = ev.html_link;
      meetLink = ev.meet_link;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "create event failed" },
        { status: 500 }
      );
    }
  } else {
    eventId = `demo-event-${Date.now()}`;
    meetLink = `https://meet.google.com/demo-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // Log as a meeting activity.
  const insert: Record<string, unknown> = {
    type: "meeting",
    subject: body.title,
    content: body.description ?? null,
    sentiment: "neutral",
    source: "calendar",
    deal_id: body.deal_id ?? null,
    contact_id: body.contact_id ?? null,
    metadata: {
      gcal_id: eventId,
      scheduled_for: start,
      duration_min: body.duration_min ?? 30,
      attendees: body.attendees,
      location: meetLink,
      is_demo: demo,
    },
  };
  await sb.from("activities").insert(insert as never);

  return NextResponse.json({
    ok: true,
    demo,
    event_id: eventId,
    meet_link: meetLink,
    html_link: htmlLink,
  });
}
