import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { todayISTDate } from "@/lib/time";

// ─── tool definitions (sent to Claude) ───────────────────
export const ASK_TOOLS = [
  {
    name: "get_deals",
    description:
      "List deals with optional filters. Use this to answer questions about pipeline, deal status, deals at risk, deals closing soon, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        stage: {
          type: "string",
          enum: ["lead", "discovery", "demo", "proposal", "negotiation", "closed_won", "closed_lost"],
          description: "Filter by single stage. Omit to include all stages.",
        },
        only_open: {
          type: "boolean",
          description: "If true, exclude closed_won and closed_lost. Default true.",
        },
        max_health_score: {
          type: "number",
          description: "Only return deals with health_score <= this. Useful for 'at risk' queries.",
        },
        min_value: {
          type: "number",
          description: "Only return deals with value >= this.",
        },
        closing_within_days: {
          type: "number",
          description: "Only return deals where expected_close is within N days from today.",
        },
        company_name: {
          type: "string",
          description: "Match company name (case-insensitive substring).",
        },
        limit: { type: "number", description: "Max results. Default 20." },
      },
    },
  },
  {
    name: "get_activities",
    description:
      "List activities (emails, calls, meetings, notes). Use to answer 'when did I last talk to X' or 'what was the last interaction with Y deal'.",
    input_schema: {
      type: "object" as const,
      properties: {
        deal_id: { type: "string" },
        contact_id: { type: "string" },
        contact_name: { type: "string", description: "Substring match on contact name (case-insensitive)." },
        company_name: { type: "string", description: "Substring match on company." },
        type: { type: "string", enum: ["email", "call", "meeting", "note", "task"] },
        since_days_ago: { type: "number", description: "Only return activities from last N days." },
        limit: { type: "number", description: "Max results. Default 15." },
      },
    },
  },
  {
    name: "get_contact",
    description:
      "Find a single contact by name or email. Returns the contact plus their recent activities and connected deals. Use for 'tell me about X', 'prep me for X meeting', or anything contact-specific.",
    input_schema: {
      type: "object" as const,
      properties: {
        name_or_email: {
          type: "string",
          description: "First name, full name, or email substring (case-insensitive).",
        },
      },
      required: ["name_or_email"],
    },
  },
  {
    name: "get_pipeline_summary",
    description:
      "Returns aggregate pipeline stats: counts and total value by stage, deals at risk, deals closing this month/quarter. Use for 'how's pipeline looking', 'Q2 forecast', etc.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "search_notes",
    description:
      "Full-text search across activity content + summaries. Use for 'who mentioned X' or 'find conversations about Y'.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "What to search for. Single term or short phrase." },
        limit: { type: "number", description: "Max results. Default 10." },
      },
      required: ["query"],
    },
  },
];

// ─── tool handlers (server-side) ─────────────────────────
type ToolResult = { ok: true; data: unknown } | { ok: false; error: string };

export async function runAskTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  try {
    switch (name) {
      case "get_deals":
        return { ok: true, data: await getDeals(input) };
      case "get_activities":
        return { ok: true, data: await getActivities(input) };
      case "get_contact":
        return { ok: true, data: await getContact(input) };
      case "get_pipeline_summary":
        return { ok: true, data: await getPipelineSummary() };
      case "search_notes":
        return { ok: true, data: await searchNotes(input) };
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── implementations ─────────────────────────────────────

async function getDeals(input: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const stage = input.stage as string | undefined;
  const onlyOpen = (input.only_open as boolean | undefined) ?? true;
  const maxHealth = input.max_health_score as number | undefined;
  const minValue = input.min_value as number | undefined;
  const closingDays = input.closing_within_days as number | undefined;
  const companyName = input.company_name as string | undefined;
  const limit = (input.limit as number | undefined) ?? 20;

  let q = sb
    .from("deals")
    .select(
      "id, name, value, stage, health_score, health_reason, expected_close, risk_level, ai_summary, company:companies(id, name), primary_contact:contacts!deals_primary_contact_id_fkey(id, name, role, email)"
    );
  if (stage) q = q.eq("stage", stage);
  if (onlyOpen) q = q.not("stage", "in", "(closed_won,closed_lost)");
  if (typeof maxHealth === "number") q = q.lte("health_score", maxHealth);
  if (typeof minValue === "number") q = q.gte("value", minValue);
  if (closingDays && closingDays > 0) {
    const cutoff = new Date(Date.now() + closingDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    q = q.lte("expected_close", cutoff).gte("expected_close", todayISTDate());
  }
  q = q.order("health_score", { ascending: true }).limit(limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as any[];
  if (companyName) {
    const needle = companyName.toLowerCase();
    rows = rows.filter((r) => r.company?.name?.toLowerCase().includes(needle));
  }
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    value: Number(r.value),
    stage: r.stage,
    health_score: r.health_score,
    health_reason: r.health_reason,
    expected_close: r.expected_close,
    risk_level: r.risk_level,
    ai_summary: r.ai_summary,
    company: r.company?.name,
    primary_contact: r.primary_contact
      ? `${r.primary_contact.name} (${r.primary_contact.role ?? "—"})`
      : null,
    deal_id: r.id,
    contact_id: r.primary_contact?.id ?? null,
  }));
}

async function getActivities(input: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const dealId = input.deal_id as string | undefined;
  const contactId = input.contact_id as string | undefined;
  const contactName = input.contact_name as string | undefined;
  const companyName = input.company_name as string | undefined;
  const type = input.type as string | undefined;
  const sinceDays = input.since_days_ago as number | undefined;
  const limit = (input.limit as number | undefined) ?? 15;

  let q = sb
    .from("activities")
    .select(
      "id, type, subject, ai_summary, content, sentiment, created_at, deal:deals(id, name, company:companies(name)), contact:contacts(id, name, role)"
    );
  if (dealId) q = q.eq("deal_id", dealId);
  if (contactId) q = q.eq("contact_id", contactId);
  if (type) q = q.eq("type", type);
  if (sinceDays && sinceDays > 0) {
    const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
    q = q.gte("created_at", cutoff);
  }
  q = q.order("created_at", { ascending: false }).limit(Math.max(limit * 2, 30));

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as any[];
  if (contactName) {
    const needle = contactName.toLowerCase();
    rows = rows.filter((r) => r.contact?.name?.toLowerCase().includes(needle));
  }
  if (companyName) {
    const needle = companyName.toLowerCase();
    rows = rows.filter((r) => r.deal?.company?.name?.toLowerCase().includes(needle));
  }
  return rows.slice(0, limit).map((r) => ({
    id: r.id,
    type: r.type,
    subject: r.subject,
    summary: r.ai_summary ?? r.content,
    sentiment: r.sentiment,
    when: r.created_at,
    deal: r.deal?.name,
    deal_id: r.deal?.id,
    contact: r.contact?.name,
    contact_id: r.contact?.id,
  }));
}

async function getContact(input: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const needle = String(input.name_or_email ?? "").trim();
  if (!needle) throw new Error("name_or_email required");

  const { data, error } = await sb
    .from("contacts")
    .select(
      "id, name, role, email, phone, sentiment, engagement_score, last_interaction, relationship_summary, company:companies(id, name, industry)"
    )
    .or(`name.ilike.%${needle}%,email.ilike.%${needle}%`)
    .limit(5);
  if (error) throw new Error(error.message);
  const matches = (data ?? []) as any[];
  if (matches.length === 0) return { matches: [], not_found: true };

  // If exactly one match, also pull recent activities + deals.
  if (matches.length === 1) {
    const c = matches[0];
    const [activities, deals] = await Promise.all([
      sb
        .from("activities")
        .select("type, subject, ai_summary, sentiment, created_at, deal:deals(name)")
        .eq("contact_id", c.id)
        .order("created_at", { ascending: false })
        .limit(8),
      sb
        .from("deals")
        .select("id, name, value, stage, health_score, expected_close")
        .eq("primary_contact_id", c.id),
    ]);
    return {
      contact: c,
      activities: (activities.data ?? []) as any[],
      deals: (deals.data ?? []) as any[],
    };
  }
  return { matches };
}

async function getPipelineSummary() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("deals")
    .select("id, name, value, stage, health_score, expected_close, company:companies(name)")
    .not("stage", "in", "(closed_won,closed_lost)");
  if (error) throw new Error(error.message);
  const deals = (data ?? []) as any[];

  const byStage: Record<string, { count: number; value: number }> = {};
  let totalOpen = 0;
  for (const d of deals) {
    totalOpen += Number(d.value ?? 0);
    if (!byStage[d.stage]) byStage[d.stage] = { count: 0, value: 0 };
    byStage[d.stage].count++;
    byStage[d.stage].value += Number(d.value ?? 0);
  }

  const today = todayISTDate();
  const monthEnd = new Date();
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  const monthEndStr = monthEnd.toISOString().slice(0, 10);
  const closingThisMonth = deals.filter((d) => d.expected_close && d.expected_close >= today && d.expected_close <= monthEndStr);
  const atRisk = deals.filter((d) => (d.health_score ?? 100) < 40);

  return {
    total_open_value: totalOpen,
    open_deals_count: deals.length,
    by_stage: byStage,
    closing_this_month: closingThisMonth.map((d) => ({
      deal_id: d.id,
      name: d.name,
      company: d.company?.name,
      value: Number(d.value),
      expected_close: d.expected_close,
      stage: d.stage,
    })),
    at_risk: atRisk.map((d) => ({
      deal_id: d.id,
      name: d.name,
      company: d.company?.name,
      value: Number(d.value),
      health_score: d.health_score,
      stage: d.stage,
    })),
  };
}

async function searchNotes(input: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const query = String(input.query ?? "").trim();
  const limit = (input.limit as number | undefined) ?? 10;
  if (!query) throw new Error("query required");

  const { data, error } = await sb
    .from("activities")
    .select(
      "id, type, subject, ai_summary, content, sentiment, created_at, deal:deals(id, name, company:companies(name)), contact:contacts(id, name, role)"
    )
    .or(`subject.ilike.%${query}%,ai_summary.ilike.%${query}%,content.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    type: r.type,
    subject: r.subject,
    summary: r.ai_summary ?? r.content,
    when: r.created_at,
    deal: r.deal?.name,
    deal_id: r.deal?.id,
    contact: r.contact?.name,
    contact_id: r.contact?.id,
  }));
}
