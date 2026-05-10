import { NextResponse } from "next/server";
import { sendGmail } from "@/lib/google/gmail";
import { isGoogleConnected, isDemoMode, readTokenRow } from "@/lib/google/tokens";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  to: string;
  subject: string;
  body: string;
  deal_id?: string;
  contact_id?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json({ error: "to, subject, body required" }, { status: 400 });
  }

  if (!(await isGoogleConnected())) {
    return NextResponse.json({ error: "Google not connected" }, { status: 401 });
  }

  const demo = await isDemoMode();
  const sb = supabaseAdmin();
  const tokenRow = await readTokenRow();

  let gmailId = "";
  let threadId = "";

  if (!demo) {
    try {
      const result = await sendGmail({ to: body.to, subject: body.subject, body: body.body });
      gmailId = result.id;
      threadId = result.threadId;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "send failed" },
        { status: 500 }
      );
    }
  } else {
    gmailId = `demo-sent-${Date.now()}`;
    threadId = gmailId;
  }

  // Log as an activity (real or demo).
  const insert: Record<string, unknown> = {
    type: "email",
    subject: body.subject,
    content: body.body,
    sentiment: "neutral",
    source: "gmail",
    contact_id: body.contact_id ?? null,
    deal_id: body.deal_id ?? null,
    metadata: {
      gmail_id: gmailId,
      gmail_thread_id: threadId,
      from: tokenRow?.email,
      to: body.to,
      sent_via: "gmail",
      is_inbound: false,
      is_demo: demo,
    },
  };
  await sb.from("activities").insert(insert as never);
  if (body.contact_id) {
    await sb
      .from("contacts")
      .update({ last_interaction: new Date().toISOString() } as never)
      .eq("id", body.contact_id);
  }

  return NextResponse.json({ ok: true, gmail_id: gmailId, thread_id: threadId, demo });
}
