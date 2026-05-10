import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { status?: "pending" | "completed" | "cancelled"; description?: string; due_date?: string };

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as Body;
  const update: Record<string, unknown> = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.description !== undefined) update.description = body.description;
  if (body.due_date !== undefined) update.due_date = body.due_date;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields" }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { error } = await sb.from("tasks").update(update as never).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
