import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { anthropic, MODELS, logAIUsage } from "@/lib/anthropic/client";
import { prioritiesSystemPrompt, PRIORITIES_TOOL, PrioritiesResponse } from "@/lib/anthropic/prompts";
import { todayISTDate, daysAgoIST } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── shape used by the prompt context ─────────────────────
type Snapshot = {
  today: string;
  open_deals: Array<{
    id: string;
    name: string;
    company: string;
    value: number;
    stage: string;
    health_score: number;
    health_reason: string | null;
    expected_close: string | null;
    risk_level: string;
    primary_contact: { id: string | null; name: string | null; role: string | null; email: string | null };
    days_in_stage: number;
  }>;
  recent_activities: Array<{
    id: string;
    deal: string | null;
    company: string | null;
    contact: string | null;
    type: string;
    subject: string | null;
    summary: string | null;
    sentiment: string;
    days_ago: number;
  }>;
  pending_tasks: Array<{
    id: string;
    description: string;
    due_date: string | null;
    priority: string;
    status: string;
    overdue: boolean;
    deal_id: string | null;
    deal_name: string | null;
    company: string | null;
    contact_name: string | null;
  }>;
  upcoming_meetings: Array<{
    id: string;
    subject: string;
    scheduled_for: string;
    deal_id: string | null;
    deal_name: string | null;
    company: string | null;
    contact_name: string | null;
    contact_role: string | null;
    location: string | null;
    duration_min: number | null;
  }>;
  recent_email_opens: Array<{
    activity_id: string | null;
    subject: string | null;
    recipient: string | null;
    opens: number;
    clicks: number;
    last_opened: string | null;
    deal_id: string | null;
    deal_name: string | null;
    contact_name: string | null;
  }>;
};

export async function GET() {
  const sb = supabaseAdmin();
  const fourteenDaysAgo = daysAgoIST(14).toISOString();
  const today = todayISTDate();

  const sevenDaysAgo = daysAgoIST(7).toISOString();

  // ─── parallel fetch ───────────────────────────────────────
  const [dealsRes, activitiesRes, tasksRes, meetingsRes, opensRes] = await Promise.all([
    sb
      .from("deals")
      .select(
        "id, name, value, stage, health_score, health_reason, expected_close, risk_level, primary_contact_id, created_at, updated_at, company:companies(name), primary_contact:contacts!deals_primary_contact_id_fkey(id, name, role, email)"
      )
      .not("stage", "in", "(closed_won,closed_lost)")
      .order("health_score", { ascending: true }),

    sb
      .from("activities")
      .select(
        "id, deal_id, contact_id, type, subject, ai_summary, sentiment, source, created_at, deal:deals(name, company:companies(name)), contact:contacts(name, role)"
      )
      .gte("created_at", fourteenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(10),

    sb
      .from("tasks")
      .select(
        "id, description, due_date, priority, status, deal_id, contact_id, deal:deals(name, company:companies(name)), contact:contacts(name)"
      )
      .eq("status", "pending")
      .order("due_date", { ascending: true }),

    sb
      .from("activities")
      .select(
        "id, deal_id, contact_id, subject, metadata, deal:deals(name, company:companies(name)), contact:contacts(name, role)"
      )
      .eq("type", "meeting")
      .order("created_at", { ascending: false }),

    sb
      .from("email_tracking")
      .select(
        "activity_id, subject, recipient_email, opens, clicks, last_opened, activity:activities(deal_id, contact_id, deal:deals(name), contact:contacts(name))"
      )
      .gt("opens", 0)
      .gte("last_opened", sevenDaysAgo)
      .order("last_opened", { ascending: false })
      .limit(8),
  ]);

  if (dealsRes.error) return NextResponse.json({ error: dealsRes.error.message }, { status: 500 });
  if (activitiesRes.error) return NextResponse.json({ error: activitiesRes.error.message }, { status: 500 });
  if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 });
  if (meetingsRes.error) return NextResponse.json({ error: meetingsRes.error.message }, { status: 500 });

  // Cast to any[] — without generated Supabase types, joined columns infer as `never`.
  const deals = (dealsRes.data ?? []) as any[];
  const activities = (activitiesRes.data ?? []) as any[];
  const tasks = (tasksRes.data ?? []) as any[];
  const meetingsRaw = (meetingsRes.data ?? []) as any[];
  const opensRaw = ((opensRes as any)?.data ?? []) as any[];

  const now = Date.now();
  const TWO_DAYS = 48 * 60 * 60 * 1000;

  // ─── build snapshot for Claude ────────────────────────────
  const snapshot: Snapshot = {
    today,
    open_deals: deals.map((d) => {
      const updated = new Date(d.updated_at).getTime();
      const days = Math.max(0, Math.floor((now - updated) / (24 * 60 * 60 * 1000)));
      const company = (d as any).company?.name ?? "—";
      const pc = (d as any).primary_contact;
      return {
        id: d.id,
        name: d.name,
        company,
        value: Number(d.value ?? 0),
        stage: d.stage,
        health_score: d.health_score,
        health_reason: d.health_reason,
        expected_close: d.expected_close,
        risk_level: d.risk_level,
        primary_contact: {
          id: pc?.id ?? null,
          name: pc?.name ?? null,
          role: pc?.role ?? null,
          email: pc?.email ?? null,
        },
        days_in_stage: days,
      };
    }),
    recent_activities: activities.map((a) => {
      const created = new Date(a.created_at).getTime();
      const daysAgo = Math.max(0, Math.floor((now - created) / (24 * 60 * 60 * 1000)));
      return {
        id: a.id,
        deal: (a as any).deal?.name ?? null,
        company: (a as any).deal?.company?.name ?? null,
        contact: (a as any).contact?.name ?? null,
        type: a.type,
        subject: a.subject,
        summary: a.ai_summary,
        sentiment: a.sentiment,
        days_ago: daysAgo,
      };
    }),
    pending_tasks: tasks.map((t) => ({
      id: t.id,
      description: t.description,
      due_date: t.due_date,
      priority: t.priority,
      status: t.status,
      overdue: t.due_date ? t.due_date < today : false,
      deal_id: t.deal_id,
      deal_name: (t as any).deal?.name ?? null,
      company: (t as any).deal?.company?.name ?? null,
      contact_name: (t as any).contact?.name ?? null,
    })),
    upcoming_meetings: meetingsRaw
      .map((m) => {
        const meta = (m.metadata ?? {}) as { scheduled_for?: string; location?: string; duration_min?: number };
        return { row: m, meta };
      })
      .filter(({ meta }) => {
        if (!meta.scheduled_for) return false;
        const t = new Date(meta.scheduled_for).getTime();
        return t >= now && t <= now + TWO_DAYS;
      })
      .sort((a, b) => new Date(a.meta.scheduled_for!).getTime() - new Date(b.meta.scheduled_for!).getTime())
      .map(({ row, meta }) => ({
        id: row.id,
        subject: row.subject ?? "Meeting",
        scheduled_for: meta.scheduled_for!,
        deal_id: row.deal_id,
        deal_name: row.deal?.name ?? null,
        company: row.deal?.company?.name ?? null,
        contact_name: row.contact?.name ?? null,
        contact_role: row.contact?.role ?? null,
        location: meta.location ?? null,
        duration_min: meta.duration_min ?? null,
      })),

    recent_email_opens: opensRaw.map((o) => ({
      activity_id: o.activity_id,
      subject: o.subject,
      recipient: o.recipient_email,
      opens: o.opens,
      clicks: o.clicks,
      last_opened: o.last_opened,
      deal_id: o.activity?.deal_id ?? null,
      deal_name: o.activity?.deal?.name ?? null,
      contact_name: o.activity?.contact?.name ?? null,
    })),
  };

  // ─── deterministic stats (don't ask Claude) ───────────────
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const stats = {
    pipeline_value: snapshot.open_deals.reduce((sum, d) => sum + d.value, 0),
    deals_closing_this_month: snapshot.open_deals.filter((d) => {
      if (!d.expected_close) return false;
      const dt = new Date(d.expected_close).getTime();
      return dt >= monthStart.getTime() && dt < monthEnd.getTime();
    }).length,
    follow_ups_due: snapshot.pending_tasks.filter((t) => t.overdue || t.due_date === today).length,
    deals_at_risk: snapshot.open_deals.filter((d) => d.health_score < 40).length,
  };

  // ─── deterministic Coming Up — no AI needed for meetings ──
  // Format the upcoming meetings into ComingUpItem shape directly. This
  // saves output tokens and means meetings are instant on the page.
  const deterministicComingUp = snapshot.upcoming_meetings.map((m) => {
    const briefParts: string[] = [];
    if (m.deal_name && m.company) briefParts.push(`${m.company} · ${m.deal_name}`);
    if (m.contact_name) briefParts.push(`with ${m.contact_name}${m.contact_role ? ` (${m.contact_role})` : ""}`);
    const brief = briefParts.length > 0 ? briefParts.join(" · ") : "Upcoming meeting on your calendar.";

    const subtitleParts: string[] = [];
    if (m.contact_name) subtitleParts.push(m.contact_name);
    if (m.deal_name) subtitleParts.push(m.deal_name);
    const subtitle = subtitleParts.join(" · ");

    return {
      id: m.id,
      title: m.subject,
      subtitle,
      scheduled_for: m.scheduled_for,
      brief,
      deal_id: m.deal_id ?? undefined,
      contact_id: undefined,
      location: m.location ?? undefined,
      actions: m.deal_id
        ? [
            { type: "view_deal" as const, label: "Open deal", deal_id: m.deal_id },
            ...(m.location && m.location.startsWith("http")
              ? []
              : []),
          ]
        : [],
    };
  });

  // ─── call Claude with the priorities tool ─────────────────
  // Don't send upcoming_meetings to the model — Coming Up is generated
  // deterministically above, so we skip the tokens.
  const aiSnapshot = { ...snapshot, upcoming_meetings: [] };
  const userMessage = [
    "Here is the snapshot. Produce right_now and actions_ready (coming_up is handled separately, return [] for it).",
    "",
    "```json",
    JSON.stringify(aiSnapshot, null, 2),
    "```",
  ].join("\n");

  console.log(
    `[priorities] snapshot size: ${userMessage.length} chars, ~${Math.round(userMessage.length / 4)} tokens`
  );
  console.log(
    `[priorities] meetings in snapshot: ${snapshot.upcoming_meetings.length}, recent activities: ${snapshot.recent_activities.length}, deals: ${snapshot.open_deals.length}, tasks: ${snapshot.pending_tasks.length}`
  );

  // Seed with deterministic coming_up so meetings are always present, even
  // if the AI call fails entirely.
  let priorities: PrioritiesResponse = {
    right_now: [],
    coming_up: deterministicComingUp as any,
    actions_ready: [],
  };
  let aiError: string | null = null;

  try {
    const response = await anthropic().messages.create({
      model: MODELS.fast, // Haiku 4.5 — ~3-5x faster than Sonnet for structured ranking
      max_tokens: 4000,
      system: prioritiesSystemPrompt(),
      tools: [PRIORITIES_TOOL as any],
      tool_choice: { type: "tool", name: PRIORITIES_TOOL.name },
      messages: [{ role: "user", content: userMessage }],
    });
    console.log(
      `[priorities] tokens in=${response.usage?.input_tokens} out=${response.usage?.output_tokens}`
    );

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use" && toolUse.name === PRIORITIES_TOOL.name) {
      const partial = toolUse.input as Partial<PrioritiesResponse>;
      priorities = {
        right_now: partial.right_now ?? [],
        // Always use the deterministic Coming Up — ignore whatever the model returned.
        coming_up: deterministicComingUp as any,
        actions_ready: partial.actions_ready ?? [],
      };
    } else {
      aiError = "Claude did not return a tool_use block";
    }

    await logAIUsage({
      role: "assistant",
      content: `priorities: ${priorities.right_now.length} urgent, ${priorities.coming_up.length} meetings, ${priorities.actions_ready.length} actions`,
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
    });
  } catch (err) {
    console.error("priorities AI call failed:", err);
    aiError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    stats,
    ...priorities,
    ai_error: aiError,
    generated_at: new Date().toISOString(),
  });
}
