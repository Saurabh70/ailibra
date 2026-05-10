import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend webhook receiver. Verifies svix signatures (TODO: enforce in
 * production) and updates email_tracking on email.opened / email.clicked.
 *
 * In dev, this route is unused — Resend can't reach localhost. It's wired
 * for production deployment.
 */
export async function POST(req: Request) {
  const event = await req.json();
  const type = event?.type as string | undefined;
  const data = event?.data;
  if (!type || !data?.email_id) {
    return NextResponse.json({ ignored: true });
  }

  const sb = supabaseAdmin();
  if (type === "email.opened") {
    const { data: row } = await sb
      .from("email_tracking")
      .select("id, opens")
      .eq("resend_email_id", data.email_id)
      .single();
    if (row) {
      await sb
        .from("email_tracking")
        .update({
          opens: ((row as any).opens ?? 0) + 1,
          last_opened: new Date().toISOString(),
        } as never)
        .eq("id", (row as any).id);
    }
  } else if (type === "email.clicked") {
    const { data: row } = await sb
      .from("email_tracking")
      .select("id, clicks")
      .eq("resend_email_id", data.email_id)
      .single();
    if (row) {
      await sb
        .from("email_tracking")
        .update({ clicks: ((row as any).clicks ?? 0) + 1 } as never)
        .eq("id", (row as any).id);
    }
  }

  return NextResponse.json({ ok: true });
}
