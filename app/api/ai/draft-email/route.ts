import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { anthropic, MODELS, logAIUsage } from "@/lib/anthropic/client";
import { nowIST } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = {
  name: "submit_email_draft",
  description: "Submit the email draft.",
  input_schema: {
    type: "object" as const,
    properties: {
      to_name: { type: "string", description: "Recipient first name." },
      to_email: { type: "string" },
      subject: { type: "string" },
      body: {
        type: "string",
        description:
          "Plain-text email body. Friendly but tight. Reference specific context from the deal/activities. Sign off with the rep's name placeholder, e.g. 'Best,\\n[Your Name]'.",
      },
    },
    required: ["to_name", "subject", "body"],
  },
};

type Body = { deal_id: string; intent?: string; type?: "follow_up" | "intro" | "proposal" };

export async function POST(req: Request) {
  const { deal_id, intent, type = "follow_up" } = (await req.json()) as Body;
  if (!deal_id) return NextResponse.json({ error: "deal_id required" }, { status: 400 });

  const sb = supabaseAdmin();
  const [dealRes, activitiesRes] = await Promise.all([
    sb
      .from("deals")
      .select(
        "id, name, value, stage, health_score, health_reason, expected_close, ai_summary, company:companies(name, industry), primary_contact:contacts!deals_primary_contact_id_fkey(id, name, role, email)"
      )
      .eq("id", deal_id)
      .single(),
    sb
      .from("activities")
      .select("type, subject, content, ai_summary, sentiment, created_at, contact:contacts(name, role)")
      .eq("deal_id", deal_id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const dAny = dealRes as any;
  if (dAny.error || !dAny.data) {
    return NextResponse.json({ error: dAny.error?.message ?? "deal not found" }, { status: 404 });
  }
  const deal = dAny.data;
  const activities = ((activitiesRes as any).data ?? []) as any[];

  const userMessage = JSON.stringify(
    {
      deal: {
        name: deal.name,
        company: deal.company?.name,
        value: Number(deal.value),
        stage: deal.stage,
        health_score: deal.health_score,
        health_reason: deal.health_reason,
        ai_summary: deal.ai_summary,
        expected_close: deal.expected_close,
        primary_contact: deal.primary_contact,
      },
      recent_activities: activities.map((a) => ({
        type: a.type,
        subject: a.subject,
        summary: a.ai_summary ?? a.content,
        when: a.created_at,
        contact: a.contact?.name,
      })),
      intent: intent ?? null,
      email_type: type,
    },
    null,
    2
  );

  const system = `You write tight follow-up emails for a B2B sales rep. Today is ${nowIST("EEEE, d MMM yyyy")}.

Given a deal, its activity history, and the rep's intent, produce ONE email draft using the submit_email_draft tool.

Rules:
- Address the primary_contact by first name.
- Reference specific things from the recent activities (questions they asked, commitments made, etc.). Don't generalize.
- Keep the body under 150 words. Friendly but professional. No fluff.
- One clear ask or next step at the end.
- If the rep gave an intent, that's the focus of the email.
- Do NOT include placeholders like [Your Name] mid-text — only at the sign-off.
- Subject: ≤ 60 chars, specific.`;

  try {
    const response = await anthropic().messages.create({
      model: MODELS.default,
      max_tokens: 700,
      system,
      tools: [TOOL as any],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: userMessage }],
    });

    const tu = response.content.find((c) => c.type === "tool_use");
    if (!tu || tu.type !== "tool_use") {
      return NextResponse.json({ error: "no tool_use" }, { status: 500 });
    }
    const out = (tu as any).input as { to_name: string; to_email?: string; subject: string; body: string };

    await logAIUsage({
      role: "assistant",
      content: `draft-email ${deal_id} (${type})`,
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
    });

    return NextResponse.json({
      ...out,
      to_email: out.to_email ?? deal.primary_contact?.email ?? "",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
