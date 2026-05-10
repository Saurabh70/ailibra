import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  stage?: string;
  value?: number;
  expected_close?: string | null;
  primary_contact_id?: string | null;
  name?: string;
};

const STAGES = ["lead", "discovery", "demo", "proposal", "negotiation", "closed_won", "closed_lost"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = (await req.json()) as Body;

  const update: Record<string, unknown> = {};
  if (body.stage !== undefined) {
    if (!STAGES.includes(body.stage)) {
      return NextResponse.json({ error: "invalid stage" }, { status: 400 });
    }
    update.stage = body.stage;
  }
  if (body.value !== undefined) update.value = body.value;
  if (body.expected_close !== undefined) update.expected_close = body.expected_close;
  if (body.primary_contact_id !== undefined) update.primary_contact_id = body.primary_contact_id;
  if (body.name !== undefined) update.name = body.name;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from("deals").update(update as never).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, updated: Object.keys(update) });
}
