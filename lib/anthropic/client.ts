import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv_ } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: serverEnv_().ANTHROPIC_API_KEY });
  return client;
}

/**
 * Model IDs — current Claude 4.x family.
 * Default to Sonnet 4.6 for cost/quality balance.
 * Use Haiku for high-volume cheap calls; Opus for the Ask page if quality demands.
 */
export const MODELS = {
  default: "claude-sonnet-4-6" as const,
  fast: "claude-haiku-4-5-20251001" as const,
  best: "claude-opus-4-7" as const,
};

export type LogAIArgs = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  actions_taken?: unknown[];
  input_tokens?: number;
  output_tokens?: number;
};

export async function logAIUsage(args: LogAIArgs) {
  try {
    await supabaseAdmin()
      .from("ai_conversations")
      .insert({
        role: args.role,
        content: args.content,
        actions_taken: args.actions_taken ?? [],
        input_tokens: args.input_tokens ?? null,
        output_tokens: args.output_tokens ?? null,
      } as never);
  } catch (err) {
    console.error("logAIUsage failed (non-fatal):", err);
  }
}
