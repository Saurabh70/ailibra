import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Debug — directly tests SDK behaviour against a fresh client.
 */
export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const apiKeyTail = apiKey ? apiKey.slice(-10) : "NONE";
  const apiKeyLength = apiKey.length;

  // Also check whether any Anthropic env overrides are set.
  const envOverrides = {
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL ?? null,
    ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN ? "SET" : null,
    ANTHROPIC_BEDROCK_BASE_URL: process.env.ANTHROPIC_BEDROCK_BASE_URL ?? null,
    ANTHROPIC_VERTEX_PROJECT_ID: process.env.ANTHROPIC_VERTEX_PROJECT_ID ?? null,
    ANTHROPIC_LOG: process.env.ANTHROPIC_LOG ?? null,
  };

  // Fresh client, explicit key only.
  const client = new Anthropic({ apiKey });

  try {
    const tiny = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 10,
      messages: [{ role: "user", content: "ping" }],
    });
    return NextResponse.json({
      ok: true,
      apiKeyTail,
      apiKeyLength,
      envOverrides,
      tiny_usage: tiny.usage,
      model: tiny.model,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      apiKeyTail,
      apiKeyLength,
      envOverrides,
      error: err?.message ?? String(err),
      status: err?.status,
      err_type: typeof err,
      err_name: err?.name,
      // SDK error usually has request id in headers
      request_id: err?.requestID ?? err?.request_id,
    });
  }
}
