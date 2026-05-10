import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Generates 6-8 realistic-looking inbound emails from existing seeded contacts
 * and inserts them as activities tagged source=gmail.
 * The activities are dated within the last ~5 days to look "fresh".
 */

const HOUR_MS = 60 * 60 * 1000;

type DemoEmail = {
  contact_email_part: string; // matches contact email substring
  subject: string;
  body: string;
  hours_ago: number;
  sentiment: "positive" | "neutral" | "negative";
};

const DEMO_EMAILS: DemoEmail[] = [
  {
    contact_email_part: "vikram@zerodha.com",
    subject: "Re: Pricing locked for tomorrow's signature review",
    body: "Got it — pricing looks good. Confirming we're locked in for tomorrow at 3:30. Legal will join from our side.\n\nVikram",
    hours_ago: 3,
    sentiment: "positive",
  },
  {
    contact_email_part: "ananya@zerodha.com",
    subject: "Re: API doc question",
    body: "Thanks for the webhook retry doc. One follow-up: do retries respect exponential backoff or fixed intervals? Asking because our dashboards need to chart the curve.\n\n— Ananya",
    hours_ago: 6,
    sentiment: "neutral",
  },
  {
    contact_email_part: "priya@razorpay.com",
    subject: "Re: Quick question on SSO",
    body: "1-week works. We've got Okta on our side; will share the SAML metadata once we're ready to test.\n\nLet me know what we'll need from your team to enable SSO.\n\nPriya",
    hours_ago: 9,
    sentiment: "positive",
  },
  {
    contact_email_part: "divya@swiggy.com",
    subject: "Re: Proposal sent",
    body: "Reviewed the proposal. Two questions:\n\n1) Onboarding timeline — is the 3-month estimate firm or aspirational?\n2) Can we add an exit clause if pilot KPIs don't hit by month 6?\n\nOtherwise looks great. Aiming to revert with a final yes/no by Friday.\n\nDivya",
    hours_ago: 18,
    sentiment: "positive",
  },
  {
    contact_email_part: "sneha@cred.club",
    subject: "Compliance Q&A — additional questions",
    body: "Few more compliance items came up after our last call:\n\n- BAA template — can you share?\n- Data residency: is everything US-only or are there EU regions?\n- Encryption at rest: which KMS provider?\n\nNeed answers before I can take this to legal.\n\nThanks,\nSneha",
    hours_ago: 26,
    sentiment: "neutral",
  },
  {
    contact_email_part: "aditya@nykaa.com",
    subject: "Re: Pricing flexibility memo",
    body: "Appreciate the memo. Going to take this to leadership next week — Q3 might still be the more realistic target on our side. Will revert.\n\nAditya",
    hours_ago: 38,
    sentiment: "neutral",
  },
  {
    contact_email_part: "neha@swiggy.com",
    subject: "Curriculum mapping — small change",
    body: "We added two new electives last week (Intro to AI + Data Storytelling). Sending updated curriculum doc — can you fold these into the platform mapping before the proposal walkthrough?\n\n- Neha",
    hours_ago: 50,
    sentiment: "positive",
  },
  {
    contact_email_part: "karan@zerodha.com",
    subject: "Compliance Module — finally circling back",
    body: "Sorry for the silence. The case study landed well internally. Can we set up a 30 min walkthrough with my team next week to dig into the automation depth? Tuesday or Wednesday afternoon if you have time.\n\nKaran",
    hours_ago: 72,
    sentiment: "positive",
  },
];

export type DemoSyncResult = {
  total_fetched: number;
  inserted: number;
  skipped_existing: number;
  skipped_no_match: number;
  matched_contacts: number;
  errors: string[];
};

export async function runDemoGmailSync(): Promise<DemoSyncResult> {
  const sb = supabaseAdmin();
  const result: DemoSyncResult = {
    total_fetched: DEMO_EMAILS.length,
    inserted: 0,
    skipped_existing: 0,
    skipped_no_match: 0,
    matched_contacts: 0,
    errors: [],
  };

  // Pre-load contacts to match by email.
  const { data: contactsRaw } = await sb.from("contacts").select("id, name, email, company_id");
  const contacts = ((contactsRaw ?? []) as any[]).filter((c) => c.email);
  const contactByEmail = new Map<string, any>();
  for (const c of contacts) contactByEmail.set(c.email.toLowerCase(), c);

  // Pre-load deals.
  const { data: dealsRaw } = await sb
    .from("deals")
    .select("id, primary_contact_id, company_id")
    .not("stage", "in", "(closed_won,closed_lost)");
  const dealsByContact = new Map<string, string>();
  const dealsByCompany = new Map<string, string>();
  for (const d of (dealsRaw ?? []) as any[]) {
    if (d.primary_contact_id) dealsByContact.set(d.primary_contact_id, d.id);
    if (d.company_id && !dealsByCompany.has(d.company_id)) dealsByCompany.set(d.company_id, d.id);
  }

  // Dedupe by demo_id in metadata so re-runs don't double-insert.
  const { data: existing } = await sb
    .from("activities")
    .select("metadata")
    .eq("source", "gmail")
    .limit(500);
  const existingDemoIds = new Set<string>();
  for (const a of (existing ?? []) as any[]) {
    const id = a.metadata?.demo_id;
    if (id) existingDemoIds.add(id);
  }

  for (const email of DEMO_EMAILS) {
    const demoId = `demo:${email.contact_email_part}:${email.subject}`;
    if (existingDemoIds.has(demoId)) {
      result.skipped_existing++;
      continue;
    }
    const contact = contactByEmail.get(email.contact_email_part.toLowerCase());
    if (!contact) {
      result.skipped_no_match++;
      continue;
    }
    result.matched_contacts++;

    const dealId = dealsByContact.get(contact.id) ?? dealsByCompany.get(contact.company_id) ?? null;
    const when = new Date(Date.now() - email.hours_ago * HOUR_MS).toISOString();

    const insert: Record<string, unknown> = {
      type: "email",
      subject: email.subject,
      content: email.body,
      ai_summary: null,
      sentiment: email.sentiment,
      source: "gmail",
      contact_id: contact.id,
      deal_id: dealId,
      created_at: when,
      metadata: {
        demo_id: demoId,
        from: email.contact_email_part,
        to: "you@ailibra.local",
        snippet: email.body.slice(0, 100),
        is_inbound: true,
        is_demo: true,
      },
    };

    const { error } = await sb.from("activities").insert(insert as never);
    if (error) {
      result.errors.push(`${email.subject}: ${error.message}`);
      continue;
    }
    result.inserted++;

    await sb
      .from("contacts")
      .update({ last_interaction: when } as never)
      .eq("id", contact.id);
  }

  return result;
}
