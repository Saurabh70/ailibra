import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

// ─── tool definitions sent to Claude ─────────────────────
export const COMMAND_TOOLS = [
  {
    name: "find_or_create_company",
    description:
      "Find a company by name (fuzzy match) or create a new one if not found. Returns company_id. ALWAYS call this first if a company is mentioned.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Company name as the user wrote it." },
        industry: { type: "string", description: "Optional, only if user mentioned." },
        size: { type: "string", description: "Optional, only if user mentioned." },
      },
      required: ["name"],
    },
  },
  {
    name: "find_or_create_contact",
    description:
      "Find a contact by name within the given company, or create a new one. Returns contact_id.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Full name as the user wrote it." },
        company_id: {
          type: "string",
          description: "Company id from find_or_create_company.",
        },
        role: { type: "string", description: "Optional title." },
        email: { type: "string" },
        phone: { type: "string" },
      },
      required: ["name", "company_id"],
    },
  },
  {
    name: "find_or_create_deal",
    description:
      "Find an open deal at the given company, or create a new one. If multiple open deals exist and the user didn't specify which, use deal_name to match. Returns deal_id.",
    input_schema: {
      type: "object" as const,
      properties: {
        company_id: { type: "string" },
        name: {
          type: "string",
          description:
            "Deal name. Required when creating; for matching, leave empty if user didn't specify.",
        },
        value: { type: "number", description: "Dollar amount (e.g. $50K → 50000)." },
        stage: {
          type: "string",
          enum: ["lead", "discovery", "demo", "proposal", "negotiation"],
        },
        primary_contact_id: { type: "string" },
        expected_close: { type: "string", description: "ISO date YYYY-MM-DD." },
      },
      required: ["company_id"],
    },
  },
  {
    name: "update_deal",
    description: "Update fields on an existing deal.",
    input_schema: {
      type: "object" as const,
      properties: {
        deal_id: { type: "string" },
        name: { type: "string" },
        stage: {
          type: "string",
          enum: [
            "lead",
            "discovery",
            "demo",
            "proposal",
            "negotiation",
            "closed_won",
            "closed_lost",
          ],
        },
        value: { type: "number" },
        expected_close: { type: "string", description: "ISO date YYYY-MM-DD." },
        primary_contact_id: { type: "string" },
      },
      required: ["deal_id"],
    },
  },
  {
    name: "log_activity",
    description:
      "Log a new activity (call, email, meeting, note). Use this for anything that happened. The content should be specific (who said what, decisions made).",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["call", "email", "meeting", "note"] },
        subject: { type: "string", description: "Short title." },
        content: {
          type: "string",
          description: "What happened, paraphrased from the user's note.",
        },
        deal_id: { type: "string" },
        contact_id: { type: "string" },
        sentiment: {
          type: "string",
          enum: ["positive", "neutral", "negative"],
          description: "Inferred from the note.",
        },
        scheduled_for: {
          type: "string",
          description: "For UPCOMING meetings only — ISO datetime when the meeting will happen.",
        },
      },
      required: ["type", "content"],
    },
  },
  {
    name: "create_task",
    description:
      "Create a follow-up task. Use whenever the user mentions a next step ('schedule X', 'send Y by Friday', 'follow up on Z next week').",
    input_schema: {
      type: "object" as const,
      properties: {
        description: { type: "string" },
        due_date: {
          type: "string",
          description: "ISO date YYYY-MM-DD. Compute relative dates from today.",
        },
        deal_id: { type: "string" },
        contact_id: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["description"],
    },
  },
  {
    name: "answer",
    description:
      "Submit your final response. Call this exactly once at the end of every command, even for failures or pure questions.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: {
          type: "string",
          description:
            "Natural-language summary of what you did, in second person. Lead with the most important action. Mention names and amounts. ≤ 100 words.",
        },
        actions: {
          type: "array",
          description: "Suggested next actions, max 3.",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["view_deal", "view_contact", "draft_email"],
              },
              label: { type: "string" },
              deal_id: { type: "string" },
              contact_id: { type: "string" },
              intent: { type: "string" },
            },
            required: ["type", "label"],
          },
        },
      },
      required: ["summary", "actions"],
    },
  },
];

// ─── tool handlers ───────────────────────────────────────
type Result = { ok: true; data: unknown } | { ok: false; error: string };

export type CommandActionLog = {
  tool: string;
  result: string;
  ids?: { deal_id?: string; contact_id?: string; company_id?: string; task_id?: string; activity_id?: string };
};

export async function runCommandTool(
  name: string,
  input: Record<string, unknown>,
  log: CommandActionLog[]
): Promise<Result> {
  try {
    switch (name) {
      case "find_or_create_company":
        return await findOrCreateCompany(input, log);
      case "find_or_create_contact":
        return await findOrCreateContact(input, log);
      case "find_or_create_deal":
        return await findOrCreateDeal(input, log);
      case "update_deal":
        return await updateDeal(input, log);
      case "log_activity":
        return await logActivity(input, log);
      case "create_task":
        return await createTask(input, log);
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function findOrCreateCompany(
  input: Record<string, unknown>,
  log: CommandActionLog[]
): Promise<Result> {
  const sb = supabaseAdmin();
  const name = String(input.name ?? "").trim();
  if (!name) return { ok: false, error: "name required" };

  const { data: existing, error } = await sb
    .from("companies")
    .select("id, name, industry, size")
    .ilike("name", `%${name}%`)
    .limit(5);
  if (error) throw new Error(error.message);
  const matches = (existing ?? []) as any[];

  if (matches.length === 1) {
    log.push({
      tool: "find_or_create_company",
      result: `matched existing: ${matches[0].name}`,
      ids: { company_id: matches[0].id },
    });
    return {
      ok: true,
      data: { company_id: matches[0].id, name: matches[0].name, created: false },
    };
  }

  if (matches.length > 1) {
    log.push({
      tool: "find_or_create_company",
      result: `${matches.length} ambiguous matches for "${name}"`,
    });
    return {
      ok: true,
      data: {
        ambiguous: true,
        matches: matches.map((m) => ({ id: m.id, name: m.name, industry: m.industry })),
      },
    };
  }

  const insert: Record<string, unknown> = { name };
  if (input.industry) insert.industry = input.industry;
  if (input.size) insert.size = input.size;

  const { data: created, error: cErr } = await sb
    .from("companies")
    .insert(insert as never)
    .select()
    .single();
  if (cErr) throw new Error(cErr.message);
  const c = created as any;
  log.push({
    tool: "find_or_create_company",
    result: `created new: ${c.name}`,
    ids: { company_id: c.id },
  });
  return { ok: true, data: { company_id: c.id, name: c.name, created: true } };
}

async function findOrCreateContact(
  input: Record<string, unknown>,
  log: CommandActionLog[]
): Promise<Result> {
  const sb = supabaseAdmin();
  const name = String(input.name ?? "").trim();
  const company_id = String(input.company_id ?? "");
  if (!name) return { ok: false, error: "name required" };
  if (!company_id) return { ok: false, error: "company_id required" };

  const { data: existing, error } = await sb
    .from("contacts")
    .select("id, name, role, email")
    .eq("company_id", company_id)
    .ilike("name", `%${name}%`)
    .limit(5);
  if (error) throw new Error(error.message);
  const matches = (existing ?? []) as any[];

  if (matches.length === 1) {
    // Optionally enrich missing fields if user provided new info.
    const update: Record<string, unknown> = {};
    if (input.role && !matches[0].role) update.role = input.role;
    if (input.email && !matches[0].email) update.email = input.email;
    if (Object.keys(update).length > 0) {
      await sb.from("contacts").update(update as never).eq("id", matches[0].id);
    }
    log.push({
      tool: "find_or_create_contact",
      result: `matched existing: ${matches[0].name}`,
      ids: { contact_id: matches[0].id },
    });
    return {
      ok: true,
      data: { contact_id: matches[0].id, name: matches[0].name, created: false },
    };
  }

  const insert: Record<string, unknown> = {
    name,
    company_id,
    last_interaction: new Date().toISOString(),
  };
  if (input.role) insert.role = input.role;
  if (input.email) insert.email = input.email;
  if (input.phone) insert.phone = input.phone;

  const { data: created, error: cErr } = await sb
    .from("contacts")
    .insert(insert as never)
    .select()
    .single();
  if (cErr) throw new Error(cErr.message);
  const c = created as any;
  log.push({
    tool: "find_or_create_contact",
    result: `created new: ${c.name}`,
    ids: { contact_id: c.id },
  });
  return { ok: true, data: { contact_id: c.id, name: c.name, created: true } };
}

async function findOrCreateDeal(
  input: Record<string, unknown>,
  log: CommandActionLog[]
): Promise<Result> {
  const sb = supabaseAdmin();
  const company_id = String(input.company_id ?? "");
  const name = (input.name as string | undefined)?.trim();
  if (!company_id) return { ok: false, error: "company_id required" };

  // First, try to match an existing open deal.
  let q = sb
    .from("deals")
    .select("id, name, value, stage, primary_contact_id")
    .eq("company_id", company_id)
    .not("stage", "in", "(closed_won,closed_lost)");
  if (name) q = q.ilike("name", `%${name}%`);
  const { data: existing, error } = await q.limit(5);
  if (error) throw new Error(error.message);
  const matches = (existing ?? []) as any[];

  if (matches.length === 1) {
    log.push({
      tool: "find_or_create_deal",
      result: `matched existing deal: ${matches[0].name}`,
      ids: { deal_id: matches[0].id, company_id },
    });
    return {
      ok: true,
      data: {
        deal_id: matches[0].id,
        name: matches[0].name,
        stage: matches[0].stage,
        value: Number(matches[0].value),
        created: false,
      },
    };
  }

  // No name and multiple deals — return ambiguity for the model to disambiguate.
  if (!name && matches.length > 1) {
    log.push({
      tool: "find_or_create_deal",
      result: `${matches.length} open deals at this company; need a name`,
    });
    return {
      ok: true,
      data: {
        ambiguous: true,
        matches: matches.map((m) => ({ id: m.id, name: m.name, stage: m.stage, value: Number(m.value) })),
      },
    };
  }

  // Create.
  const dealName = name ?? "New Deal";
  const insert: Record<string, unknown> = {
    company_id,
    name: dealName,
    stage: input.stage ?? "lead",
    value: input.value ?? 0,
  };
  if (input.primary_contact_id) insert.primary_contact_id = input.primary_contact_id;
  if (input.expected_close) insert.expected_close = input.expected_close;

  const { data: created, error: cErr } = await sb
    .from("deals")
    .insert(insert as never)
    .select()
    .single();
  if (cErr) throw new Error(cErr.message);
  const d = created as any;
  log.push({
    tool: "find_or_create_deal",
    result: `created new deal: ${d.name} ($${Number(d.value)})`,
    ids: { deal_id: d.id, company_id },
  });
  return {
    ok: true,
    data: { deal_id: d.id, name: d.name, stage: d.stage, value: Number(d.value), created: true },
  };
}

async function updateDeal(
  input: Record<string, unknown>,
  log: CommandActionLog[]
): Promise<Result> {
  const sb = supabaseAdmin();
  const deal_id = String(input.deal_id ?? "");
  if (!deal_id) return { ok: false, error: "deal_id required" };
  const update: Record<string, unknown> = {};
  for (const k of ["name", "stage", "value", "expected_close", "primary_contact_id"] as const) {
    if (input[k] !== undefined) update[k] = input[k];
  }
  if (Object.keys(update).length === 0) {
    return { ok: false, error: "no fields to update" };
  }
  const { error } = await sb.from("deals").update(update as never).eq("id", deal_id);
  if (error) throw new Error(error.message);
  log.push({
    tool: "update_deal",
    result: `updated ${Object.keys(update).join(", ")}`,
    ids: { deal_id },
  });
  return { ok: true, data: { deal_id, updated_fields: Object.keys(update) } };
}

async function logActivity(
  input: Record<string, unknown>,
  log: CommandActionLog[]
): Promise<Result> {
  const sb = supabaseAdmin();
  const type = String(input.type ?? "");
  const content = String(input.content ?? "").trim();
  if (!type || !content) return { ok: false, error: "type and content required" };

  const metadata: Record<string, unknown> = {};
  if (input.scheduled_for) metadata.scheduled_for = input.scheduled_for;

  const insert: Record<string, unknown> = {
    type,
    content,
    sentiment: input.sentiment ?? "neutral",
    source: "manual",
    metadata,
  };
  if (input.subject) insert.subject = input.subject;
  if (input.deal_id) insert.deal_id = input.deal_id;
  if (input.contact_id) insert.contact_id = input.contact_id;

  const { data, error } = await sb
    .from("activities")
    .insert(insert as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const a = data as any;

  // Bump last_interaction on the contact if known.
  if (input.contact_id) {
    await sb
      .from("contacts")
      .update({ last_interaction: new Date().toISOString() } as never)
      .eq("id", input.contact_id);
  }

  log.push({
    tool: "log_activity",
    result: `${type}: ${(input.subject as string | undefined) ?? content.slice(0, 60)}`,
    ids: {
      activity_id: a.id,
      deal_id: input.deal_id as string | undefined,
      contact_id: input.contact_id as string | undefined,
    },
  });
  return { ok: true, data: { activity_id: a.id } };
}

async function createTask(
  input: Record<string, unknown>,
  log: CommandActionLog[]
): Promise<Result> {
  const sb = supabaseAdmin();
  const description = String(input.description ?? "").trim();
  if (!description) return { ok: false, error: "description required" };

  const insert: Record<string, unknown> = {
    description,
    priority: input.priority ?? "medium",
    status: "pending",
    ai_generated: true,
  };
  if (input.due_date) insert.due_date = input.due_date;
  if (input.deal_id) insert.deal_id = input.deal_id;
  if (input.contact_id) insert.contact_id = input.contact_id;

  const { data, error } = await sb.from("tasks").insert(insert as never).select().single();
  if (error) throw new Error(error.message);
  const t = data as any;
  log.push({
    tool: "create_task",
    result: `task: ${description.slice(0, 60)}${input.due_date ? ` (due ${input.due_date})` : ""}`,
    ids: { task_id: t.id, deal_id: input.deal_id as string | undefined },
  });
  return { ok: true, data: { task_id: t.id } };
}
