import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { anthropic, MODELS, logAIUsage } from "@/lib/anthropic/client";
import { nowIST } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = {
  name: "submit_deal_summary",
  description: "Return the deal AI summary as structured data.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description:
          "1-2 sentences capturing the deal state: who, what stage, key buying signals or risks, and where momentum is.",
      },
      next_move: {
        type: "string",
        description:
          "1 sentence: the single highest-leverage next move the rep should make today.",
      },
      email_intent: {
        type: "string",
        description:
          "If a follow-up email would help, a one-line description of its purpose. Empty string if email isn't the right move.",
      },
    },
    required: ["summary", "next_move", "email_intent"],
  },
};

export async function POST(req: Request) {
  const { deal_id, force } = (await req.json()) as { deal_id: string; force?: boolean };
  if (!deal_id) return NextResponse.json({ error: "deal_id required" }, { status: 400 });

  const sb = supabaseAdmin();

  const [dealRes, activitiesRes] = await Promise.all([
    sb
      .from("deals")
      .select(
        "id, name, value, stage, health_score, health_reason, expected_close, risk_level, ai_summary, company:companies(name, industry), primary_contact:contacts!deals_primary_contact_id_fkey(name, role, email)"
      )
      .eq("id", deal_id)
      .single(),
    sb
      .from("activities")
      .select("type, subject, content, ai_summary, sentiment, created_at, contact:contacts(name, role)")
      .eq("deal_id", deal_id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const dealAny = dealRes as any;
  if (dealAny.error || !dealAny.data) {
    return NextResponse.json({ error: dealAny.error?.message ?? "Deal not found" }, { status: 404 });
  }
  const deal = dealAny.data;
  if (!force && deal.ai_summary) {
    return NextResponse.json({
      summary: deal.ai_summary,
      next_move: null,
      email_intent: null,
      cached: true,
    });
  }

  const activities = ((activitiesRes as any).data ?? ([] as any[])).map((a: any) => ({
    type: a.type,
    subject: a.subject,
    summary: a.ai_summary ?? a.content,
    sentiment: a.sentiment,
    when: a.created_at,
    contact: a.contact ? `${a.contact.name} (${a.contact.role ?? "—"})` : null,
  }));

  const userMessage = JSON.stringify(
    {
      deal: {
        name: deal.name,
        company: deal.company?.name,
        industry: deal.company?.industry,
        value: Number(deal.value),
        stage: deal.stage,
        health_score: deal.health_score,
        health_reason: deal.health_reason,
        expected_close: deal.expected_close,
        primary_contact: deal.primary_contact,
      },
      activities,
    },
    null,
    2
  );

  const system = `You write tight, useful deal summaries for B2B sales reps.
Today is ${nowIST("EEEE, d MMM yyyy")}.

Given a deal and its activities, produce:
- summary: 1-2 sentences, second-person where natural ("you"), capturing where the deal is and the key signal or risk. Quote names and specifics.
- next_move: 1 sentence, the single highest-leverage thing the rep should do TODAY to advance this deal.
- email_intent: if an email would help, one line describing its purpose. Empty string if email isn't the next move.

Be specific and punchy. No filler. Use the submit_deal_summary tool.`;

  try {
    const response = await anthropic().messages.create({
      model: MODELS.default,
      max_tokens: 600,
      system,
      tools: [TOOL as any],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: userMessage }],
    });

    const tu = response.content.find((c) => c.type === "tool_use");
    if (!tu || tu.type !== "tool_use") {
      return NextResponse.json({ error: "no tool_use" }, { status: 500 });
    }
    const out = tu.input as { summary: string; next_move: string; email_intent: string };

    // Cache on the deal row.
    await sb
      .from("deals")
      .update({ ai_summary: out.summary } as never)
      .eq("id", deal_id);

    await logAIUsage({
      role: "assistant",
      content: `deal-summary ${deal_id}`,
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
    });

    return NextResponse.json({ ...out, cached: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
