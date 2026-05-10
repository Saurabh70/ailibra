import { NextResponse } from "next/server";
import { anthropic, MODELS, logAIUsage } from "@/lib/anthropic/client";
import { COMMAND_TOOLS, runCommandTool, type CommandActionLog } from "@/lib/anthropic/command-tools";
import { supabaseAdmin } from "@/lib/supabase/server";
import { nowIST, todayISTDate } from "@/lib/time";
import type { PriorityAction } from "@/types/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CommandRequest = { message: string };
type CommandResponse = {
  summary: string;
  actions: PriorityAction[];
  log: CommandActionLog[];
  error?: string;
};

const ANSWER_TOOL_NAME = "answer";

function systemPrompt(snapshot: object): string {
  return `You are the AI brain of an AI-native CRM. The user just typed a free-form note or request into the always-visible command bar.

Today is ${nowIST("EEEE, d MMM yyyy, h:mm a")} (Asia/Kolkata).

Snapshot of current state (use this for context, don't pass to tools):
${JSON.stringify(snapshot, null, 2)}

Your job: parse the note and use the available tools to update the CRM, then call \`answer\` with a natural-language summary.

WORKFLOW (follow this order):
1. If a company is mentioned → call find_or_create_company
2. If a contact is mentioned → call find_or_create_contact (needs company_id)
3. If a deal is mentioned → call find_or_create_deal (needs company_id; pass primary_contact_id if known)
4. If something happened (a call/email/meeting/note) → call log_activity (with deal_id and contact_id from earlier steps)
5. If a next step is mentioned ("schedule X", "send Y by Friday", "follow up next week") → call create_task with a computed due_date
6. ALWAYS finish with \`answer\`

DATE COMPUTATION:
- "today" → ${todayISTDate()}
- "tomorrow" → ${addDays(todayISTDate(), 1)}
- "Friday" → next upcoming Friday from today (compute it)
- "next week" → 7 days from today
- "EOW"/"end of week" → upcoming Friday
- All dates output as YYYY-MM-DD.

DOLLAR PARSING: "$50K" → 50000, "$1.5M" → 1500000, "$25k" → 25000.

IMPORTANT:
- Use REAL ids returned by tools — never invent ids.
- If a tool returns ambiguous: true, pick the most likely match based on context, or call answer asking the user to clarify.
- If the input is vague, do your best and note ambiguity in the answer.
- Be concise in the answer summary — second person, ≤ 80 words.
- Suggest 1-3 follow-up actions in answer.actions (e.g. view_deal for the deal you touched).`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00+05:30");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const body = (await req.json()) as CommandRequest;
  const message = body.message?.trim() ?? "";
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // Build a tiny snapshot so the model has context (e.g. existing companies).
  const sb = supabaseAdmin();
  const [companiesRes, contactsRes] = await Promise.all([
    sb.from("companies").select("id, name").order("name"),
    sb.from("contacts").select("id, name, company_id").order("name").limit(40),
  ]);
  const companies = ((companiesRes as any).data ?? []) as Array<{ id: string; name: string }>;
  const contacts = ((contactsRes as any).data ?? []) as Array<{
    id: string;
    name: string;
    company_id: string;
  }>;
  const snapshot = {
    companies: companies.map((c) => ({ id: c.id, name: c.name })),
    contacts: contacts.map((c) => ({ id: c.id, name: c.name, company_id: c.company_id })),
    today: todayISTDate(),
  };

  const messages: any[] = [{ role: "user", content: message }];
  const log: CommandActionLog[] = [];
  let summary = "";
  let actions: PriorityAction[] = [];
  let totalIn = 0;
  let totalOut = 0;
  let aiError: string | null = null;

  try {
    for (let iter = 0; iter < 6; iter++) {
      const response = await anthropic().messages.create({
        model: MODELS.default,
        max_tokens: 1500,
        system: systemPrompt(snapshot),
        tools: COMMAND_TOOLS as any,
        messages,
      });
      totalIn += response.usage?.input_tokens ?? 0;
      totalOut += response.usage?.output_tokens ?? 0;

      const toolUses = response.content.filter((c) => c.type === "tool_use");
      const answerCall = toolUses.find((c: any) => c.name === ANSWER_TOOL_NAME);

      if (answerCall) {
        const out = (answerCall as any).input as { summary: string; actions: PriorityAction[] };
        summary = out.summary;
        actions = out.actions ?? [];
        break;
      }

      if (toolUses.length === 0) {
        // Plain text fallback.
        const text = response.content
          .filter((c) => c.type === "text")
          .map((c: any) => c.text)
          .join("\n");
        summary = text || "I wasn't sure how to handle that. Try being more specific.";
        break;
      }

      messages.push({ role: "assistant", content: response.content });
      const toolResults: any[] = [];
      for (const tu of toolUses as any[]) {
        const r = await runCommandTool(tu.name, tu.input, log);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: r.ok ? JSON.stringify(r.data) : `Error: ${r.error}`,
          is_error: !r.ok,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }
  } catch (err) {
    aiError = err instanceof Error ? err.message : String(err);
  }

  await logAIUsage({
    role: "assistant",
    content: `command: "${message.slice(0, 100)}" → ${log.length} actions`,
    actions_taken: log,
    input_tokens: totalIn,
    output_tokens: totalOut,
  });

  if (aiError) {
    return NextResponse.json({ summary, actions, log, error: aiError } satisfies CommandResponse, { status: 500 });
  }

  return NextResponse.json({ summary, actions, log } satisfies CommandResponse);
}
