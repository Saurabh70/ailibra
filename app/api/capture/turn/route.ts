import { NextResponse } from "next/server";
import { anthropic, MODELS, logAIUsage } from "@/lib/anthropic/client";
import {
  CAPTURE_TOOLS,
  ASK_USER_TOOL,
  COMMIT_TOOL,
  runCommandTool,
  type CommandActionLog,
} from "@/lib/anthropic/capture-tools";
import { supabaseAdmin } from "@/lib/supabase/server";
import { nowIST, todayISTDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CaptureTurn = {
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

type CaptureResponse =
  | {
      status: "asking";
      question: string;
      options: string[];
      allow_custom: boolean;
    }
  | {
      status: "committed";
      summary: string;
      log: CommandActionLog[];
    }
  | { status: "error"; error: string };

function systemPrompt(snapshot: object): string {
  return `You are a virtual sales-ops assistant inside an AI-native CRM. The rep tells you what just happened (calls, emails, meetings, deals updates). Your job is to capture it precisely into the CRM.

Today is ${nowIST("EEEE, d MMM yyyy, h:mm a")}.

Snapshot of existing CRM data (use to inform MCQ options):
${JSON.stringify(snapshot, null, 2)}

CONVERSATION RULES:
1. If the rep's note is incomplete (missing contact, missing topic, ambiguous deal), use the \`ask_user\` tool to ask ONE clarifying question with 3-5 multiple-choice options. NEVER ask multiple questions in one go.
2. The MCQ options must reference REAL data from the snapshot when relevant — actual contact names at the company, the actual deal names, common topics from past activities. Last option should usually be "Other".
3. Set \`allow_custom: true\` unless the answer space is genuinely closed.
4. Once you have enough info, use the entity tools (find_or_create_company → find_or_create_contact → find_or_create_deal → log_activity → create_task) to persist, then call \`commit\` with a short natural-language summary.
5. Never invent contacts/deals not in the snapshot. If the rep mentions someone unfamiliar, ask whether to create a new contact.

DATE COMPUTATION:
- "today" → ${todayISTDate()}
- "tomorrow" → next day
- "Friday", "next week", "EOW" → compute relative to today.
- Output dates as YYYY-MM-DD.

DOLLAR PARSING: "$50K" → 50000, "$1.5M" → 1500000.

WORKFLOW: ask the minimum number of questions to lock in: who, what, (and if relevant) deal value, next step. Two or three follow-ups is usually enough — don't over-ask. If the note is already complete (e.g., "Logged a call with Priya about pricing, will send proposal next Tuesday"), skip questions and commit directly.`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as CaptureTurn;
  const history = body.history ?? [];
  if (history.length === 0) {
    return NextResponse.json({ status: "error", error: "history required" } satisfies CaptureResponse, { status: 400 });
  }

  // Snapshot for context.
  const sb = supabaseAdmin();
  const [companiesRes, contactsRes, dealsRes] = await Promise.all([
    sb.from("companies").select("id, name").order("name"),
    sb
      .from("contacts")
      .select("id, name, role, company_id")
      .order("name")
      .limit(40),
    sb
      .from("deals")
      .select("id, name, value, stage, company_id, primary_contact_id")
      .not("stage", "in", "(closed_won,closed_lost)"),
  ]);
  const companies = ((companiesRes as any).data ?? []) as Array<{ id: string; name: string }>;
  const contacts = ((contactsRes as any).data ?? []) as Array<{
    id: string;
    name: string;
    role: string | null;
    company_id: string;
  }>;
  const deals = ((dealsRes as any).data ?? []) as Array<{
    id: string;
    name: string;
    value: number;
    stage: string;
    company_id: string;
    primary_contact_id: string | null;
  }>;

  const snapshot = {
    companies: companies.map((c) => ({ id: c.id, name: c.name })),
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      company_id: c.company_id,
    })),
    open_deals: deals,
    today: todayISTDate(),
  };

  // Build messages.
  const messages: any[] = history.map((m) => ({ role: m.role, content: m.content }));

  const log: CommandActionLog[] = [];
  let totalIn = 0;
  let totalOut = 0;

  try {
    for (let iter = 0; iter < 6; iter++) {
      const response = await anthropic().messages.create({
        model: MODELS.default,
        max_tokens: 1500,
        system: systemPrompt(snapshot),
        tools: CAPTURE_TOOLS as any,
        messages,
      });
      totalIn += response.usage?.input_tokens ?? 0;
      totalOut += response.usage?.output_tokens ?? 0;

      const toolUses = response.content.filter((c) => c.type === "tool_use");
      const askCall = toolUses.find((c: any) => c.name === ASK_USER_TOOL.name);
      const commitCall = toolUses.find((c: any) => c.name === COMMIT_TOOL.name);

      if (askCall) {
        const out = (askCall as any).input as {
          question: string;
          options: string[];
          allow_custom?: boolean;
        };
        await logAIUsage({
          role: "assistant",
          content: `capture-ask: ${out.question.slice(0, 80)}`,
          input_tokens: totalIn,
          output_tokens: totalOut,
        });
        return NextResponse.json({
          status: "asking",
          question: out.question,
          options: out.options ?? [],
          allow_custom: out.allow_custom ?? true,
        } satisfies CaptureResponse);
      }

      if (commitCall) {
        const out = (commitCall as any).input as { summary: string };
        await logAIUsage({
          role: "assistant",
          content: `capture-commit: ${log.length} actions`,
          actions_taken: log,
          input_tokens: totalIn,
          output_tokens: totalOut,
        });
        return NextResponse.json({
          status: "committed",
          summary: out.summary,
          log,
        } satisfies CaptureResponse);
      }

      if (toolUses.length === 0) {
        // Plain text from model — treat as a question without options.
        const text = response.content
          .filter((c) => c.type === "text")
          .map((c: any) => c.text)
          .join("\n");
        return NextResponse.json({
          status: "asking",
          question: text || "Tell me a bit more — who, what, when?",
          options: ["Other"],
          allow_custom: true,
        } satisfies CaptureResponse);
      }

      // Otherwise, run entity tools and continue.
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
    return NextResponse.json({
      status: "error",
      error: "loop limit reached without commit",
    } satisfies CaptureResponse);
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : "capture failed" } satisfies CaptureResponse,
      { status: 500 }
    );
  }
}
