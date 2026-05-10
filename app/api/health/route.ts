import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hasGoogle, hasApollo, hasResend } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Debug endpoint — confirms the app can reach Supabase and reports
 * which integrations are configured. Useful at the end of every phase.
 */
export async function GET() {
  const sb = supabaseAdmin();

  const [companies, contacts, deals, activities, tasks] = await Promise.all([
    sb.from("companies").select("id", { count: "exact", head: true }),
    sb.from("contacts").select("id", { count: "exact", head: true }),
    sb.from("deals").select("id", { count: "exact", head: true }),
    sb.from("activities").select("id", { count: "exact", head: true }),
    sb.from("tasks").select("id", { count: "exact", head: true }),
  ]);

  const dbError =
    companies.error || contacts.error || deals.error || activities.error || tasks.error;

  return NextResponse.json({
    ok: !dbError,
    db: {
      reachable: !dbError,
      error: dbError?.message ?? null,
      counts: {
        companies: companies.count,
        contacts: contacts.count,
        deals: deals.count,
        activities: activities.count,
        tasks: tasks.count,
      },
    },
    integrations: {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      google: hasGoogle(),
      apollo: hasApollo(),
      resend: hasResend(),
    },
    runtime: "nodejs",
    now: new Date().toISOString(),
  });
}
