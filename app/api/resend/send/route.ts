import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hasResend } from "@/lib/env";

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

  const sb = supabaseAdmin();
  const useReal = hasResend();

  let resendId = "";
  let demo = !useReal;

  if (useReal) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ailibra <onboarding@resend.dev>",
          to: [body.to],
          subject: body.subject,
          text: body.body,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        return NextResponse.json(
          { error: data?.message ?? "resend send failed" },
          { status: 500 }
        );
      }
      resendId = data.id;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "resend error" },
        { status: 500 }
      );
    }
  } else {
    resendId = `demo-tracked-${Date.now()}`;
  }

  // Log activity.
  const { data: activity, error: actErr } = await sb
    .from("activities")
    .insert({
      type: "email",
      subject: body.subject,
      content: body.body,
      sentiment: "neutral",
      source: "ai",
      deal_id: body.deal_id ?? null,
      contact_id: body.contact_id ?? null,
      metadata: {
        resend_id: resendId,
        to: body.to,
        sent_via: "resend",
        is_inbound: false,
        is_demo: demo,
      },
    } as never)
    .select()
    .single();

  if (actErr) {
    return NextResponse.json({ error: actErr.message }, { status: 500 });
  }

  // Track row.
  const trackingInsert: Record<string, unknown> = {
    activity_id: (activity as any).id,
    resend_email_id: resendId,
    recipient_email: body.to,
    subject: body.subject,
    sent_via: "resend",
    opens: 0,
    clicks: 0,
  };

  // In demo mode, simulate an open + click 30s out so the user sees it
  // appear on next refresh of Flow / deal page.
  if (demo) {
    trackingInsert.opens = 1;
    trackingInsert.last_opened = new Date(Date.now() - 30 * 1000).toISOString();
  }

  await sb.from("email_tracking").insert(trackingInsert as never);

  if (body.contact_id) {
    await sb
      .from("contacts")
      .update({ last_interaction: new Date().toISOString() } as never)
      .eq("id", body.contact_id);
  }

  return NextResponse.json({ ok: true, demo, resend_id: resendId, tracked: true });
}
