// Shared types for the Ask chat — server + client safe.

import type { PriorityAction } from "@/types/ai";

export type AskRole = "user" | "assistant";

export type AskToolCall = {
  name: string;
  input: Record<string, unknown>;
  result_summary?: string; // what we'll show in the UI as "queried X"
};

export type AskMessage = {
  id: string;
  role: AskRole;
  content: string;
  // For assistant messages, the actions the user can click.
  actions?: PriorityAction[];
  // For assistant messages, what tools were called to produce the answer.
  tool_calls?: AskToolCall[];
  created_at: string;
};

export type AskRequest = {
  message: string;
  history: Array<{ role: AskRole; content: string }>;
};

export type AskResponse = {
  answer: string;
  actions: PriorityAction[];
  tool_calls: AskToolCall[];
  error?: string;
};
