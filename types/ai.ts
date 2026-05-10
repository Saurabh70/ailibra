// Shared AI response types — safe to import from both server and client.

export type ActionType =
  | "view_deal"
  | "view_contact"
  | "draft_email"
  | "complete_task"
  | "schedule_meeting"
  | "send_now"
  | "skip";

export type PriorityAction = {
  type: ActionType;
  label: string;
  deal_id?: string;
  contact_id?: string;
  task_id?: string;
  intent?: string;
};

export type RightNowItem = {
  id: string;
  title: string;
  subtitle: string;
  reason: string;
  urgency: "critical" | "high" | "medium";
  deal_id?: string;
  contact_id?: string;
  actions: PriorityAction[];
};

export type ComingUpItem = {
  id: string;
  title: string;
  subtitle: string;
  scheduled_for?: string;
  brief: string;
  deal_id?: string;
  contact_id?: string;
  location?: string;
  actions: PriorityAction[];
};

export type ActionsReadyItem = {
  id: string;
  title: string;
  subtitle: string;
  kind: "task" | "draft_email" | "reply";
  deal_id?: string;
  contact_id?: string;
  task_id?: string;
  actions: PriorityAction[];
};

export type FlowStats = {
  pipeline_value: number;
  deals_closing_this_month: number;
  follow_ups_due: number;
  deals_at_risk: number;
};

export type FlowPriorities = {
  stats: FlowStats;
  right_now: RightNowItem[];
  coming_up: ComingUpItem[];
  actions_ready: ActionsReadyItem[];
  ai_error: string | null;
  generated_at: string;
};
