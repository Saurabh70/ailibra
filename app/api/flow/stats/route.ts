import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { todayISTDate } from "@/lib/time";
import type { FlowStats, ComingUpItem } from "@/types/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

/**
 * Fast deterministic stats + Coming Up meetings for the Flow page header.
 * Both render instantly; AI-ranked sections (Right Now, Actions Ready) come
 * from the slower /api/ai/priorities endpoint.
 */
export async function GET() {
  const sb = supabaseAdmin();
  const today = todayISTDate();
  const now = Date.now();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const [openDeals, tasks, atRisk, meetingsRes] = await Promise.all([
    sb
      .from("deals")
      .select("value, expected_close")
      .not("stage", "in", "(closed_won,closed_lost)"),
    sb.from("tasks").select("due_date, status").eq("status", "pending"),
    sb
      .from("deals")
      .select("id", { count: "exact", head: true })
      .lt("health_score", 40)
      .not("stage", "in", "(closed_won,closed_lost)"),
    sb
      .from("activities")
      .select(
        "id, deal_id, contact_id, subject, metadata, deal:deals(name, company:companies(name)), contact:contacts(name, role)"
      )
      .eq("type", "meeting"),
  ]);

  const deals = (openDeals.data ?? []) as Array<{ value: number; expected_close: string | null }>;
  const taskRows = (tasks.data ?? []) as Array<{ due_date: string | null; status: string }>;

  const stats: FlowStats = {
    pipeline_value: deals.reduce((sum, d) => sum + Number(d.value ?? 0), 0),
    deals_closing_this_month: deals.filter((d) => {
      if (!d.expected_close) return false;
      const t = new Date(d.expected_close).getTime();
      return t >= monthStart.getTime() && t < monthEnd.getTime();
    }).length,
    follow_ups_due: taskRows.filter((t) => t.due_date && t.due_date <= today).length,
    deals_at_risk: atRisk.count ?? 0,
  };

  // ─── Coming Up: deterministic, fast ───────────────────────
  const meetingsRaw = ((meetingsRes as any).data ?? []) as any[];
  const coming_up: ComingUpItem[] = meetingsRaw
    .map((m) => {
      const meta = (m.metadata ?? {}) as { scheduled_for?: string; location?: string };
      return { row: m, meta };
    })
    .filter(({ meta }) => {
      if (!meta.scheduled_for) return false;
      const t = new Date(meta.scheduled_for).getTime();
      return t >= now && t <= now + TWO_DAYS_MS;
    })
    .sort((a, b) => new Date(a.meta.scheduled_for!).getTime() - new Date(b.meta.scheduled_for!).getTime())
    .map(({ row, meta }) => {
      const contactName = row.contact?.name as string | undefined;
      const contactRole = row.contact?.role as string | undefined;
      const dealName = row.deal?.name as string | undefined;
      const company = row.deal?.company?.name as string | undefined;
      const briefParts: string[] = [];
      if (company && dealName) briefParts.push(`${company} · ${dealName}`);
      if (contactName) briefParts.push(`with ${contactName}${contactRole ? ` (${contactRole})` : ""}`);
      const subtitleParts: string[] = [];
      if (contactName) subtitleParts.push(contactName);
      if (dealName) subtitleParts.push(dealName);

      return {
        id: row.id,
        title: (row.subject as string) ?? "Meeting",
        subtitle: subtitleParts.join(" · "),
        scheduled_for: meta.scheduled_for!,
        brief: briefParts.length ? briefParts.join(" · ") : "Upcoming meeting on your calendar.",
        deal_id: row.deal_id ?? undefined,
        contact_id: row.contact_id ?? undefined,
        location: meta.location ?? undefined,
        actions: row.deal_id
          ? [{ type: "view_deal" as const, label: "Open deal", deal_id: row.deal_id }]
          : [],
      };
    });

  return NextResponse.json({ ...stats, coming_up });
}
