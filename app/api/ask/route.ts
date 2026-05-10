import { NextResponse } from "next/server";
import { anthropic, MODELS, logAIUsage } from "@/lib/anthropic/client";
import { ASK_TOOLS, runAskTool } from "@/lib/anthropic/ask-tools";
import { supabaseAdmin } from "@/lib/supabase/server";
import { nowIST } from "@/lib/time";
import type { AskRequest, AskResponse, AskToolCall } from "@/types/ask";
import type { PriorityAction } from "@/types/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANSWER_TOOL = {
  name: "answer",
  description:
    "Submit your final answer to the user. Use this once you have enough information from the other tools (or if you don't need any tools).",
  input_schema: {
    type: "object" as const,
    properties: {
      answer: {
        type: "string",
        description:
          "Markdown-formatted answer to the user's question. Be concrete: cite contact/deal/company names and numbers from the data. If listing multiple deals or contacts, use a tight bulleted list. Lead with the headline answer; then 1-3 supporting bullets max. Keep under 200 words.",
      },
      actions: {
        type: "array",
        description:
          "Up to 3 suggested next actions for the user. Each becomes a clickable button.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["view_deal", "view_contact", "draft_email", "schedule_meeting", "send_now"],
            },
            label: { type: "string", description: "Short button text, ≤ 40 chars." },
            deal_id: { type: "string" },
            contact_id: { type: "string" },
            intent: {
              type: "string",
              description: "For draft_email: 1-line description of email purpose.",
            },
          },
          required: ["type", "label"],
        },
      },
    },
    required: ["answer", "actions"],
  },
};

function systemPrompt(snapshot: object): string {
  return `You are the AI brain of an AI-native CRM. The user is a B2B sales rep asking questions about their pipeline.
Today is ${nowIST("EEEE, d MMM yyyy, h:mm a")}.

Here is a small snapshot of pipeline state — use this to answer casual questions without a tool call:
${JSON.stringify(snapshot, null, 2)}

For specific questions about deals, contacts, activities, or searches, use the available tools:
- get_deals: filter deals by stage, health, value, close date, company
- get_activities: list emails / calls / meetings, optionally filtered by deal, contact, type, time
- get_contact: look up a single contact (returns their activities + connected deals if exact match)
- get_pipeline_summary: aggregate stats across the whole pipeline
- search_notes: full-text search activity content + summaries

GUIDELINES:
- Use tools whenever a question needs data beyond the snapshot. Do not guess.
- Multiple tool calls are fine — chain them when the user asks compound questions.
- Once you have enough, call the "answer" tool to submit your response. Do NOT mix free text with tool calls.
- Be specific: name the deal, contact, dollar amount, date.
- For prep questions ("prep me for X"), pull the relevant deal + activities and produce a tight brief: state, key issues, suggested approach.
- For "draft email" requests: don't actually write the email body, instead set up a draft_email action with a clear intent line.
- Cap your answer at ~150 words. Lead with the headline.
- Never invent data. If you can't find something via tools, say so.`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as AskRequest;
  const { message, history } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // Build a tiny snapshot for the system prompt.
  const sb = supabaseAdmin();
  const [dealsRes, tasksRes, recentRes] = await Promise.all([
    sb.from("deals").select("stage, value, health_score, expected_close").not("stage", "in", "(closed_won,closed_lost)"),
    sb.from("tasks").select("status").eq("status", "pending"),
    sb.from("activities").select("created_at").order("created_at", { ascending: false }).limit(1),
  ]);
  const deals = ((dealsRes as any).data ?? []) as Array<{ stage: string; value: number; health_score: number; expected_close: string | null }>;
  const stageCounts: Record<string, number> = {};
  for (const d of deals) stageCounts[d.stage] = (stageCounts[d.stage] ?? 0) + 1;
  const snapshot = {
    open_deals_count: deals.length,
    total_open_value: deals.reduce((s, d) => s + Number(d.value ?? 0), 0),
    by_stage_count: stageCounts,
    deals_at_risk_count: deals.filter((d) => (d.health_score ?? 100) < 40).length,
    pending_tasks: ((tasksRes as any).data ?? []).length,
    last_activity_at: ((recentRes as any).data?.[0]?.created_at) ?? null,
  };

  const messages: any[] = [
    ...(history ?? []).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  const tool_calls: AskToolCall[] = [];
  let answer = "";
  let actions: PriorityAction[] = [];
  let totalIn = 0;
  let totalOut = 0;
  const allTools = [...ASK_TOOLS, ANSWER_TOOL];

  for (let iter = 0; iter < 6; iter++) {
    const response = await anthropic().messages.create({
      model: MODELS.default,
      max_tokens: 1500,
      system: systemPrompt(snapshot),
      tools: allTools as any,
      messages,
    });
    totalIn += response.usage?.input_tokens ?? 0;
    totalOut += response.usage?.output_tokens ?? 0;

    // Look for tool_use blocks. There may be multiple in one turn.
    const toolUses = response.content.filter((c) => c.type === "tool_use");
    const answerCall = toolUses.find((c: any) => c.name === ANSWER_TOOL.name);

    if (answerCall) {
      const out = (answerCall as any).input as { answer: string; actions: PriorityAction[] };
      answer = out.answer;
      actions = out.actions ?? [];
      break;
    }

    if (toolUses.length === 0) {
      // Model returned plain text — extract it as the answer.
      const text = response.content.filter((c) => c.type === "text").map((c: any) => c.text).join("\n");
      answer = text || "I wasn't sure how to help with that. Could you rephrase?";
      break;
    }

    // Run each tool, append assistant message + tool_result message.
    messages.push({ role: "assistant", content: response.content });
    const toolResults: any[] = [];
    for (const tu of toolUses as any[]) {
      const r = await runAskTool(tu.name, tu.input);
      tool_calls.push({
        name: tu.name,
        input: tu.input,
        result_summary: r.ok
          ? `${tu.name}: ${summarizeResult(tu.name, r.data)}`
          : `${tu.name}: error — ${r.error}`,
      });
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: r.ok ? JSON.stringify(r.data) : `Error: ${r.error}`,
        is_error: !r.ok,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  await logAIUsage({
    role: "assistant",
    content: `ask: "${message.slice(0, 80)}" → ${tool_calls.length} tool calls`,
    actions_taken: tool_calls,
    input_tokens: totalIn,
    output_tokens: totalOut,
  });

  const result: AskResponse = { answer, actions, tool_calls };
  return NextResponse.json(result);
}

function summarizeResult(name: string, data: any): string {
  if (Array.isArray(data)) return `${data.length} result${data.length === 1 ? "" : "s"}`;
  if (data?.matches && Array.isArray(data.matches)) return `${data.matches.length} matches`;
  if (data?.contact) return `found ${data.contact.name}`;
  if (data?.open_deals_count != null) return `pipeline overview`;
  return "ok";
}
