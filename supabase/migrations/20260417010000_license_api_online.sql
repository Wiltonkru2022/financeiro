alter table public.license_keys
  add column if not exists document_number text,
  add column if not exists max_users integer not null default 1,
  add column if not exists modules_json jsonb not null default '["finance", "reports", "backup", "health"]'::jsonb;

alter table public.license_activations
  add column if not exists activation_token text,
  add column if not exists revoked_at timestamptz;

create unique index if not exists idx_license_activations_token
  on public.license_activations(activation_token)
  where activation_token is not null;

alter table public.license_keys enable row level security;
alter table public.license_activations enable row level security;

drop policy if exists "no_public_license_keys" on public.license_keys;
drop policy if exists "no_public_license_activations" on public.license_activations;

create policy "no_public_license_keys"
  on public.license_keys
  as restrictive
  for all
  using (false)
  with check (false);

create policy "no_public_license_activations"
  on public.license_activations
  as restrictive
  for all
  using (false)
  with check (false);
