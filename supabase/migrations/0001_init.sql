-- ─── ailibra :: initial schema ────────────────────────────
-- 8 tables for the AI-native CRM. UUIDs everywhere, timestamptz UTC.
-- Single-user app: no RLS, service role key from server only.

create extension if not exists "pgcrypto";

-- ─── companies ────────────────────────────────────────────
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  size text,
  website text,
  linkedin text,
  health_score int default 50,
  total_deal_value numeric default 0,
  created_at timestamptz default now()
);

-- ─── contacts ─────────────────────────────────────────────
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  name text not null,
  role text,
  email text,
  phone text,
  linkedin text,
  avatar_url text,
  relationship_summary text,
  last_interaction timestamptz,
  sentiment text default 'neutral',
  engagement_score int default 50,
  source text default 'manual',
  enriched_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_contacts_company on contacts(company_id);
create index if not exists idx_contacts_email on contacts(email);

-- ─── deals ────────────────────────────────────────────────
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  value numeric default 0,
  stage text default 'lead',
  health_score int default 50,
  health_reason text,
  expected_close date,
  risk_level text default 'low',
  ai_summary text,
  primary_contact_id uuid references contacts(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_deals_company on deals(company_id);
create index if not exists idx_deals_stage on deals(stage);

-- ─── activities ───────────────────────────────────────────
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  type text not null,
  subject text,
  content text,
  ai_summary text,
  sentiment text default 'neutral',
  source text default 'manual',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_activities_deal on activities(deal_id);
create index if not exists idx_activities_contact on activities(contact_id);
create index if not exists idx_activities_created on activities(created_at desc);

-- ─── tasks ────────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  description text not null,
  due_date date,
  priority text default 'medium',
  status text default 'pending',
  ai_generated boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_due on tasks(due_date);

-- ─── ai_conversations ─────────────────────────────────────
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  content text,
  actions_taken jsonb default '[]'::jsonb,
  input_tokens int,
  output_tokens int,
  created_at timestamptz default now()
);
create index if not exists idx_ai_conversations_created on ai_conversations(created_at desc);

-- ─── email_tracking ───────────────────────────────────────
create table if not exists email_tracking (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  resend_email_id text,
  recipient_email text,
  subject text,
  sent_via text default 'resend',
  opens int default 0,
  last_opened timestamptz,
  clicks int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_email_tracking_resend on email_tracking(resend_email_id);

-- ─── google_tokens (singleton) ────────────────────────────
create table if not exists google_tokens (
  id uuid primary key default gen_random_uuid(),
  access_token text,
  refresh_token text,
  expiry_date timestamptz,
  email text,
  scope text,
  created_at timestamptz default now()
);

-- ─── trigger: deals.updated_at ────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_deals_updated_at on deals;
create trigger trg_deals_updated_at
  before update on deals
  for each row execute function set_updated_at();
