create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null,
  email text,
  role text not null default 'admin' check (role in ('admin', 'manager', 'operator', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  party_type text not null check (party_type in ('customer', 'supplier', 'both')),
  name text not null,
  document_number text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  name text not null,
  kind text not null check (kind in ('payable', 'receivable', 'both')),
  color text default '#00a884',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  name text not null,
  account_type text not null check (account_type in ('cash', 'bank', 'wallet', 'card', 'loan', 'store', 'other')),
  institution text,
  current_balance numeric(14, 2) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  local_id bigint,
  entry_type text not null check (entry_type in ('payable', 'receivable')),
  description text not null,
  party_id uuid references public.parties(id),
  category_id uuid references public.categories(id),
  cost_center_id uuid references public.cost_centers(id),
  account_id uuid references public.accounts(id),
  payment_method_id uuid references public.payment_methods(id),
  competence_date date,
  issue_date date,
  due_date date not null,
  settlement_date date,
  amount_total numeric(14, 2) not null default 0 check (amount_total >= 0),
  amount_discount numeric(14, 2) not null default 0 check (amount_discount >= 0),
  amount_interest numeric(14, 2) not null default 0 check (amount_interest >= 0),
  amount_penalty numeric(14, 2) not null default 0 check (amount_penalty >= 0),
  amount_settled numeric(14, 2) not null default 0 check (amount_settled >= 0),
  status text not null default 'open' check (status in ('draft', 'open', 'partial', 'settled', 'overdue', 'cancelled')),
  plan_type text not null default 'single' check (plan_type in ('single', 'fixed', 'installment')),
  installment_number integer,
  installment_total integer,
  fixed_until date,
  recurrence_group text,
  cancellation_reason text,
  cancelled_at timestamptz,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  entry_id uuid not null references public.financial_entries(id) on delete cascade,
  settlement_date date not null,
  amount numeric(14, 2) not null check (amount >= 0),
  discount numeric(14, 2) not null default 0 check (discount >= 0),
  interest numeric(14, 2) not null default 0 check (interest >= 0),
  penalty numeric(14, 2) not null default 0 check (penalty >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  entry_type text not null check (entry_type in ('payable', 'receivable')),
  description text not null,
  party_id uuid references public.parties(id),
  category_id uuid references public.categories(id),
  cost_center_id uuid references public.cost_centers(id),
  account_id uuid references public.accounts(id),
  payment_method_id uuid references public.payment_methods(id),
  default_amount numeric(14, 2) not null default 0,
  plan_type text not null default 'fixed' check (plan_type in ('fixed', 'installment')),
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly', 'custom_days')),
  interval_value integer not null default 1,
  next_run_date date not null,
  end_date date,
  is_active boolean not null default true,
  notes text,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  entry_id uuid references public.financial_entries(id) on delete cascade,
  template_id uuid references public.recurring_templates(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('new_entry', 'due_today', 'due_soon', 'overdue', 'receivable_overdue')),
  remind_at timestamptz not null,
  channel text not null default 'desktop' check (channel in ('desktop', 'email', 'whatsapp')),
  is_read boolean not null default false,
  sent_at timestamptz,
  payload_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  product_key text not null unique,
  customer_email text not null,
  customer_name text,
  document_number text,
  plan_name text not null default 'Plano Profissional',
  status text not null default 'active' check (status in ('active', 'trial', 'blocked', 'expired')),
  device_limit integer not null default 1,
  max_users integer not null default 1,
  modules_json jsonb not null default '["finance", "reports", "backup", "health"]'::jsonb,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.license_activations (
  id uuid primary key default gen_random_uuid(),
  license_key_id uuid not null references public.license_keys(id) on delete cascade,
  device_fingerprint text not null,
  activation_token text unique,
  machine_name text,
  app_version text,
  ip_address inet,
  status text not null default 'active' check (status in ('active', 'revoked')),
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (license_key_id, device_fingerprint)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  entity_name text not null,
  entity_id uuid,
  action text not null,
  previous_data_json jsonb,
  new_data_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  log_type text not null,
  level text not null default 'info',
  message text not null,
  entity_name text,
  entity_id uuid,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_financial_entries_owner_due on public.financial_entries(owner_id, due_date);
create index if not exists idx_financial_entries_owner_status on public.financial_entries(owner_id, status);
create index if not exists idx_financial_entries_owner_type on public.financial_entries(owner_id, entry_type);
create index if not exists idx_settlements_entry on public.settlements(entry_id);
create index if not exists idx_reminders_owner_remind_at on public.reminders(owner_id, remind_at);
create index if not exists idx_license_keys_product_key on public.license_keys(product_key);
create index if not exists idx_license_activations_key on public.license_activations(license_key_id);

alter table public.profiles enable row level security;
alter table public.parties enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.cost_centers enable row level security;
alter table public.payment_methods enable row level security;
alter table public.financial_entries enable row level security;
alter table public.settlements enable row level security;
alter table public.recurring_templates enable row level security;
alter table public.reminders enable row level security;
alter table public.license_keys enable row level security;
alter table public.license_activations enable row level security;
alter table public.audit_log enable row level security;
alter table public.app_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "owner_all_parties" on public.parties;
drop policy if exists "owner_all_categories" on public.categories;
drop policy if exists "owner_all_accounts" on public.accounts;
drop policy if exists "owner_all_cost_centers" on public.cost_centers;
drop policy if exists "owner_all_payment_methods" on public.payment_methods;
drop policy if exists "owner_all_financial_entries" on public.financial_entries;
drop policy if exists "owner_all_settlements" on public.settlements;
drop policy if exists "owner_all_recurring_templates" on public.recurring_templates;
drop policy if exists "owner_all_reminders" on public.reminders;
drop policy if exists "no_public_license_keys" on public.license_keys;
drop policy if exists "no_public_license_activations" on public.license_activations;
drop policy if exists "owner_all_audit_log" on public.audit_log;
drop policy if exists "owner_all_app_logs" on public.app_logs;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = auth_user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = auth_user_id);

create policy "owner_all_parties" on public.parties for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_categories" on public.categories for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_accounts" on public.accounts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_cost_centers" on public.cost_centers for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_payment_methods" on public.payment_methods for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_financial_entries" on public.financial_entries for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_settlements" on public.settlements for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_recurring_templates" on public.recurring_templates for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_reminders" on public.reminders for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "no_public_license_keys" on public.license_keys as restrictive for all using (false) with check (false);
create policy "no_public_license_activations" on public.license_activations as restrictive for all using (false) with check (false);
create policy "owner_all_audit_log" on public.audit_log for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_app_logs" on public.app_logs for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
