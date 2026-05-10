import { NextResponse } from "next/server";
import { seedDemoData } from "@/scripts/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-seed the demo dataset. Optionally gated by SEED_TOKEN — set
 * ?token=<seed_token> on the request when running in production.
 *
 * In local dev with no token check, this is open. On Vercel, set SEED_TOKEN.
 */
export async function POST(req: Request) {
  const required = process.env.SEED_TOKEN;
  if (required) {
    const url = new URL(req.url);
    const provided = url.searchParams.get("token") ?? req.headers.get("x-seed-token");
    if (provided !== required) {
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }
  }

  try {
    await seedDemoData();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "seed failed" },
      { status: 500 }
    );
  }
}
