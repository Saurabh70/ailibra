import "server-only";
import { nowIST } from "@/lib/time";
import type { FlowPriorities } from "@/types/ai";

export type PrioritiesResponse = Pick<FlowPriorities, "right_now" | "coming_up" | "actions_ready">;

/**
 * System prompt for the daily Flow page priorities.
 * Designed to be cacheable: stable, no per-request data interpolated except the date.
 */
export function prioritiesSystemPrompt(): string {
  return `You are the AI brain of an AI-native CRM for B2B sales reps.
Your job on the Flow page is to surface what the rep should do RIGHT NOW based on signals from their pipeline data.

Today is ${nowIST("EEEE, d MMM yyyy, h:mm a")}.

You will receive:
- A snapshot of open deals with health scores
- Recent activities (last 14 days)
- Pending and overdue tasks
- Upcoming meetings (next 48 hours)

Your job: produce a ranked list of priorities split into three buckets. ALL THREE keys (right_now, coming_up, actions_ready) MUST be present in your tool call — use empty arrays if a bucket truly has nothing, but DO NOT skip the keys.

THE CLASSIFICATION RULE (most important):
For each candidate item, ask: "Is someone WAITING on me? Is a critical window CLOSING?"
- YES → RIGHT NOW (regardless of whether a task row exists for it).
- NO  → ACTIONS READY (proactive work I queued for myself).

Examples of RIGHT NOW (someone is waiting / window closing):
  • A contact emailed in the last 1-2 days and hasn't been replied to.
  • A buyer asked for something by EOD/EOW and we're in that window.
  • A pending_task is due today AND someone is on the other side of it (e.g. "Reply to Priya's SSO question" — Priya is waiting).
  • A pending_task is overdue AND tied to a deal at risk.
  • A deal's health just dropped, OR a champion went silent on a hot deal.
  • A buyer is "reviewing today" or "will revert by EOW" — that window matters.
  • A tracked email was just opened (recent_email_opens) — strike while warm.

Examples of ACTIONS READY (proactive, no one waiting):
  • "Compile a compliance Q&A doc" (rep-initiated, no external waiter).
  • "Schedule a follow-up demo for next week".
  • "Re-engage cold contact with case study" (rep-driven re-touch, not someone waiting).

CRITICAL: A pending_task should appear in EXACTLY ONE bucket. If it qualifies as Right Now, do NOT also list it in Actions Ready.

OUTPUT BUDGETS — STRICT CAPS (be concise, the user is on Haiku for speed):
  • RIGHT NOW: max 4 items
  • COMING UP: one per meeting in upcoming_meetings (max 3)
  • ACTIONS READY: max 3 items
  • title ≤ 60 chars
  • reason / brief ≤ 120 chars
  • exactly ONE action per item (skip the second unless critical)

Required fields per item:

1. RIGHT NOW: id, title (punchy second-person), subtitle (company · deal · ₹value in lakh/crore · stage — e.g. "Zerodha · Risk Engine · ₹75L · Negotiation"), reason (1 sentence with the specific signal), urgency, deal_id, contact_id, actions.

2. COMING UP: id, title, subtitle (when + with whom + deal), brief (1-2 short sentences: context + suggested approach), deal_id, contact_id, scheduled_for, location, actions.

3. ACTIONS READY: id, title, subtitle, kind (task | draft_email | reply), deal/contact/task ids, actions.

For every item, generate 1-2 action buttons. Each action has a "type" the UI uses to dispatch:
- "view_deal" — open the deal detail page (requires deal_id)
- "view_contact" — open the contact page (requires contact_id)
- "draft_email" — open a drafting flow (requires deal_id and a one-line "intent")
- "complete_task" — mark a task done (requires task_id)
- "schedule_meeting" — book follow-up (requires deal_id)
- "send_now" — send a pre-drafted email immediately (requires deal_id)
- "skip" — dismiss the signal

Tone in titles and reasons: punchy, specific, second-person. "Vikram needs final pricing locked by EOD" not "There is a pricing discussion".
Never invent contacts, deals, or events that aren't in the snapshot.

Use the submit_priorities tool to return your output. Do not write any text outside the tool call.`;
}

export const PRIORITIES_TOOL = {
  name: "submit_priorities",
  description:
    "Return the prioritised Flow page sections as structured data. Use this exactly once per call.",
  input_schema: {
    type: "object" as const,
    properties: {
      right_now: {
        type: "array",
        description: "Urgent signals needing action today, ranked by urgency (most urgent first).",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Stable id; use the deal_id or activity_id this signal originates from." },
            title: { type: "string", description: "Punchy headline. e.g. 'Vikram needs final pricing locked by EOD'." },
            subtitle: { type: "string", description: "Context line. e.g. 'Zerodha · Risk Engine Integration · ₹75L · Negotiation'. Always format money in INR (lakh/crore notation)." },
            reason: { type: "string", description: "1 sentence: why this matters now, citing the specific signal." },
            urgency: { type: "string", enum: ["critical", "high", "medium"] },
            deal_id: { type: "string" },
            contact_id: { type: "string" },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["view_deal", "view_contact", "draft_email", "complete_task", "schedule_meeting", "send_now", "skip"] },
                  label: { type: "string" },
                  deal_id: { type: "string" },
                  contact_id: { type: "string" },
                  task_id: { type: "string" },
                  intent: { type: "string", description: "For draft_email: one-line description of the email purpose." },
                },
                required: ["type", "label"],
              },
            },
          },
          required: ["id", "title", "subtitle", "reason", "urgency", "actions"],
        },
      },
      coming_up: {
        type: "array",
        description: "Meetings in the next 24 hours, with AI-generated briefs.",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string", description: "The meeting subject/title." },
            subtitle: { type: "string", description: "When + with whom + deal context." },
            scheduled_for: { type: "string", description: "ISO timestamp from the snapshot." },
            brief: { type: "string", description: "1-2 sentence prep brief. Mention the deal, key open issues, suggested approach." },
            deal_id: { type: "string" },
            contact_id: { type: "string" },
            location: { type: "string" },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["view_deal", "view_contact", "draft_email", "schedule_meeting"] },
                  label: { type: "string" },
                  deal_id: { type: "string" },
                  contact_id: { type: "string" },
                },
                required: ["type", "label"],
              },
            },
          },
          required: ["id", "title", "subtitle", "brief", "actions"],
        },
      },
      actions_ready: {
        type: "array",
        description: "Pre-prepared items the rep can review and approve quickly. Tasks, follow-up drafts, etc.",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            subtitle: { type: "string" },
            kind: { type: "string", enum: ["task", "draft_email", "reply"] },
            deal_id: { type: "string" },
            contact_id: { type: "string" },
            task_id: { type: "string" },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["complete_task", "view_deal", "draft_email", "send_now", "skip"] },
                  label: { type: "string" },
                  deal_id: { type: "string" },
                  contact_id: { type: "string" },
                  task_id: { type: "string" },
                  intent: { type: "string" },
                },
                required: ["type", "label"],
              },
            },
          },
          required: ["id", "title", "subtitle", "kind", "actions"],
        },
      },
    },
    required: ["right_now", "coming_up", "actions_ready"],
  },
};

