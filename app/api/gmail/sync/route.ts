import { NextResponse } from "next/server";
import { gmailClient, parseGmailMessage } from "@/lib/google/gmail";
import { readTokenRow, isDemoMode } from "@/lib/google/tokens";
import { runDemoGmailSync } from "@/lib/google/demo-emails";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncResult = {
  total_fetched: number;
  inserted: number;
  skipped_existing: number;
  skipped_no_match: number;
  matched_contacts: number;
  errors: string[];
  demo?: boolean;
};

export async function POST(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? "20"));

  const tokenRow = await readTokenRow();
  if (!tokenRow?.refresh_token) {
    return NextResponse.json({ error: "Google not connected" }, { status: 401 });
  }

  // Demo mode: generate fake but realistic inbound emails matched to seeded contacts.
  if (await isDemoMode()) {
    const result = await runDemoGmailSync();
    return NextResponse.json({ ...result, demo: true });
  }

  const ourEmail = tokenRow.email;

  let gmail;
  try {
    gmail = await gmailClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "auth failed" },
      { status: 401 }
    );
  }

  // Pull recent messages from inbox (skip promotions / spam / drafts).
  let listRes;
  try {
    listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: limit,
      q: "in:inbox -category:promotions -category:social",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "list failed" },
      { status: 500 }
    );
  }

  const ids = (listRes.data.messages ?? []).map((m) => m.id).filter((x): x is string => Boolean(x));
  const result: SyncResult = {
    total_fetched: ids.length,
    inserted: 0,
    skipped_existing: 0,
    skipped_no_match: 0,
    matched_contacts: 0,
    errors: [],
  };

  if (ids.length === 0) return NextResponse.json(result);

  const sb = supabaseAdmin();

  // Fetch full messages. Concurrent but throttled.
  const messages = await Promise.all(
    ids.map(async (id) => {
      try {
        const r = await gmail.users.messages.get({ userId: "me", id, format: "full" });
        return parseGmailMessage(r.data, ourEmail);
      } catch (err) {
        result.errors.push(`get ${id}: ${err instanceof Error ? err.message : "fail"}`);
        return null;
      }
    })
  );

  // Pre-load contacts for email matching.
  const { data: contactsRaw } = await sb.from("contacts").select("id, name, email, company_id");
  const contacts = ((contactsRaw ?? []) as any[]).filter((c) => c.email);
  const contactByEmail = new Map<string, any>();
  for (const c of contacts) {
    contactByEmail.set(c.email.toLowerCase(), c);
  }

  // Pre-load deals for contact → primary deal lookup (one query).
  const { data: dealsRaw } = await sb
    .from("deals")
    .select("id, name, primary_contact_id, company_id")
    .not("stage", "in", "(closed_won,closed_lost)");
  const dealsByContactId = new Map<string, string>();
  const dealsByCompanyId = new Map<string, string>();
  for (const d of (dealsRaw ?? []) as any[]) {
    if (d.primary_contact_id) dealsByContactId.set(d.primary_contact_id, d.id);
    if (d.company_id && !dealsByCompanyId.has(d.company_id)) dealsByCompanyId.set(d.company_id, d.id);
  }

  // Pre-load already-synced gmail IDs to dedupe.
  const { data: existing } = await sb
    .from("activities")
    .select("metadata")
    .eq("source", "gmail")
    .limit(500);
  const existingGmailIds = new Set<string>();
  for (const a of (existing ?? []) as any[]) {
    const id = a.metadata?.gmail_id;
    if (id) existingGmailIds.add(id);
  }

  for (const m of messages) {
    if (!m) continue;
    if (existingGmailIds.has(m.id)) {
      result.skipped_existing++;
      continue;
    }

    const counterpartyEmail = m.isInbound ? m.fromEmail : extractFirstRecipient(m.to);
    const contact = counterpartyEmail ? contactByEmail.get(counterpartyEmail) : null;

    if (!contact) {
      result.skipped_no_match++;
      continue;
    }
    result.matched_contacts++;

    const dealId =
      dealsByContactId.get(contact.id) ?? dealsByCompanyId.get(contact.company_id) ?? null;

    const insert: Record<string, unknown> = {
      type: "email",
      subject: m.subject,
      content: m.body || m.snippet,
      ai_summary: null,
      sentiment: "neutral",
      source: "gmail",
      contact_id: contact.id,
      deal_id: dealId,
      created_at: m.date,
      metadata: {
        gmail_id: m.id,
        gmail_thread_id: m.threadId,
        message_id_header: m.messageIdHeader,
        from: m.from,
        to: m.to,
        cc: m.cc,
        snippet: m.snippet,
        is_inbound: m.isInbound,
      },
    };

    const { error } = await sb.from("activities").insert(insert as never);
    if (error) {
      result.errors.push(`insert ${m.id}: ${error.message}`);
      continue;
    }
    result.inserted++;

    // Bump last_interaction.
    await sb
      .from("contacts")
      .update({ last_interaction: m.date } as never)
      .eq("id", contact.id);
  }

  return NextResponse.json(result);
}

function extractFirstRecipient(toRaw: string): string | null {
  if (!toRaw) return null;
  const first = toRaw.split(",")[0].trim();
  const m = first.match(/<([^>]+)>/);
  if (m) return m[1].toLowerCase();
  if (first.includes("@")) return first.toLowerCase();
  return null;
}
