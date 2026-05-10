import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight count for the nav badge — total things AI has captured.
 * (All activities + tasks; deals are usually not captured one-by-one.)
 */
export async function GET() {
  const sb = supabaseAdmin();
  const [acts, tasks] = await Promise.all([
    sb.from("activities").select("id", { count: "exact", head: true }),
    sb.from("tasks").select("id", { count: "exact", head: true }),
  ]);
  return NextResponse.json({
    count: (acts.count ?? 0) + (tasks.count ?? 0),
    activities: acts.count ?? 0,
    tasks: tasks.count ?? 0,
  });
}
