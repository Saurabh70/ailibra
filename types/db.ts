// Hand-written types matching supabase/migrations/0001_init.sql.
// Replace with `supabase gen types typescript` output later if we add the CLI.

export type DealStage = "lead" | "discovery" | "demo" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
export type Sentiment = "positive" | "neutral" | "negative";
export type ActivityType = "email" | "call" | "meeting" | "note" | "task";
export type TaskStatus = "pending" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type Source = "manual" | "ai" | "gmail" | "calendar";
export type EmailSentVia = "resend" | "gmail";

export type Company = {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  website: string | null;
  linkedin: string | null;
  health_score: number;
  total_deal_value: number;
  created_at: string;
};

export type Contact = {
  id: string;
  company_id: string | null;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  avatar_url: string | null;
  relationship_summary: string | null;
  last_interaction: string | null;
  sentiment: Sentiment;
  engagement_score: number;
  source: Source;
  enriched_at: string | null;
  created_at: string;
};

export type Deal = {
  id: string;
  company_id: string;
  name: string;
  value: number;
  stage: DealStage;
  health_score: number;
  health_reason: string | null;
  expected_close: string | null;
  risk_level: RiskLevel;
  ai_summary: string | null;
  primary_contact_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Activity = {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  type: ActivityType;
  subject: string | null;
  content: string | null;
  ai_summary: string | null;
  sentiment: Sentiment;
  source: Source;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Task = {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  description: string;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  ai_generated: boolean;
  created_at: string;
};

export type AIConversation = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  actions_taken: unknown[];
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

export type EmailTracking = {
  id: string;
  activity_id: string | null;
  resend_email_id: string | null;
  recipient_email: string | null;
  subject: string | null;
  sent_via: EmailSentVia;
  opens: number;
  last_opened: string | null;
  clicks: number;
  created_at: string;
};

export type GoogleTokens = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: string | null;
  email: string | null;
  scope: string | null;
  created_at: string;
};
