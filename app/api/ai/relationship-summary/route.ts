import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { anthropic, MODELS, logAIUsage } from "@/lib/anthropic/client";
import { nowIST } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = {
  name: "submit_relationship_summary",
  description: "Return the relationship summary as structured data.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description:
          "2-3 sentences capturing the relationship: how engaged the contact is, their disposition, what they've been pushing for, and any risks or signals.",
      },
      strength: {
        type: "string",
        enum: ["champion", "supporter", "neutral", "skeptic", "blocker", "unknown"],
        description: "Best characterization of the contact's stance.",
      },
    },
    required: ["summary", "strength"],
  },
};

export async function POST(req: Request) {
  const { contact_id, force } = (await req.json()) as { contact_id: string; force?: boolean };
  if (!contact_id) return NextResponse.json({ error: "contact_id required" }, { status: 400 });

  const sb = supabaseAdmin();

  const [contactRes, activitiesRes] = await Promise.all([
    sb
      .from("contacts")
      .select(
        "id, name, role, email, sentiment, engagement_score, relationship_summary, company:companies(name, industry)"
      )
      .eq("id", contact_id)
      .single(),
    sb
      .from("activities")
      .select("type, subject, content, ai_summary, sentiment, created_at, deal:deals(name, stage, value)")
      .eq("contact_id", contact_id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const cAny = contactRes as any;
  if (cAny.error || !cAny.data) {
    return NextResponse.json({ error: cAny.error?.message ?? "Not found" }, { status: 404 });
  }
  const contact = cAny.data;
  if (!force && contact.relationship_summary) {
    return NextResponse.json({ summary: contact.relationship_summary, strength: null, cached: true });
  }

  const activities = ((activitiesRes as any).data ?? ([] as any[])).map((a: any) => ({
    type: a.type,
    subject: a.subject,
    summary: a.ai_summary ?? a.content,
    sentiment: a.sentiment,
    when: a.created_at,
    deal: a.deal?.name,
  }));

  const userMessage = JSON.stringify(
    {
      contact: {
        name: contact.name,
        role: contact.role,
        company: contact.company?.name,
        industry: contact.company?.industry,
        sentiment: contact.sentiment,
        engagement_score: contact.engagement_score,
      },
      activities,
    },
    null,
    2
  );

  const system = `You write tight relationship summaries for B2B sales reps.
Today is ${nowIST("EEEE, d MMM yyyy")}.

Given a contact and their activity history, produce:
- summary: 2-3 sentences. How engaged are they? What stance? What are they pushing for or pushing back on? Any risks?
- strength: champion | supporter | neutral | skeptic | blocker | unknown.

Be specific. Reference activities that justify the read. Use the submit_relationship_summary tool.`;

  try {
    const response = await anthropic().messages.create({
      model: MODELS.default,
      max_tokens: 500,
      system,
      tools: [TOOL as any],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: userMessage }],
    });

    const tu = response.content.find((c) => c.type === "tool_use");
    if (!tu || tu.type !== "tool_use") {
      return NextResponse.json({ error: "no tool_use" }, { status: 500 });
    }
    const out = tu.input as { summary: string; strength: string };

    await sb
      .from("contacts")
      .update({ relationship_summary: out.summary } as never)
      .eq("id", contact_id);

    await logAIUsage({
      role: "assistant",
      content: `relationship-summary ${contact_id}`,
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
