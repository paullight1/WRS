-- WRS Plan 4: authoritative robot ownership, configuration, entitlements,
-- passport records and append-only XP progression.

create table if not exists public.robots (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  name text not null check (name ~ '^[A-Za-z0-9][A-Za-z0-9 _.-]{2,31}$'),
  lifecycle text not null default 'pending' check (lifecycle in ('pending','active','suspended','retired')),
  package_slug text not null check (package_slug in ('starter','builder','professional','enterprise','elite','visionary')),
  requested_package_slug text not null check (requested_package_slug in ('starter','builder','professional','enterprise','elite','visionary')),
  public_verification_id uuid not null default gen_random_uuid() unique,
  activation_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id)
);

create table if not exists public.robot_onboarding (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  step integer not null default 0 check (step between 0 and 5),
  draft jsonb not null default '{}'::jsonb,
  completion_idempotency_key text unique,
  completed_robot_id uuid unique references public.robots(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.package_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  package_slug text not null check (package_slug in ('starter','builder','professional','enterprise','elite','visionary')),
  status text not null default 'pending' check (status in ('pending','active','refunded','revoked','expired')),
  source text not null,
  source_reference text,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists package_entitlements_one_active_idx
  on public.package_entitlements(user_id)
  where status = 'active';
create unique index if not exists package_entitlements_source_ref_idx
  on public.package_entitlements(source, source_reference)
  where source_reference is not null;

create table if not exists public.robot_configurations (
  robot_id uuid primary key references public.robots(id) on delete cascade,
  version bigint not null default 1 check (version > 0),
  palette text not null,
  parts jsonb not null check (jsonb_typeof(parts) = 'object'),
  personality text not null,
  tuning jsonb not null check (jsonb_typeof(tuning) = 'object'),
  voice_profile_id text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.capability_catalog (
  slug text primary key,
  description text not null default ''
);

create table if not exists public.package_capabilities (
  package_slug text not null check (package_slug in ('starter','builder','professional','enterprise','elite','visionary')),
  capability_slug text not null references public.capability_catalog(slug) on delete cascade,
  primary key (package_slug, capability_slug)
);

create table if not exists public.robot_skills (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid not null references public.robots(id) on delete cascade,
  skill_slug text not null,
  name text not null,
  version text not null,
  verified boolean not null default false,
  source_reference text,
  installed_at timestamptz not null default now(),
  unique(robot_id, skill_slug, version)
);

create table if not exists public.robot_certifications (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid not null references public.robots(id) on delete cascade,
  certification_slug text not null,
  name text not null,
  issuer text not null,
  issued_at timestamptz not null,
  expires_at timestamptz,
  verification_reference text not null unique,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  created_at timestamptz not null default now()
);

create table if not exists public.robot_history_events (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid not null references public.robots(id) on delete cascade,
  event_type text not null,
  public_summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists robot_history_events_robot_time_idx on public.robot_history_events(robot_id, occurred_at desc);

create table if not exists public.robot_xp_events (
  id uuid primary key,
  robot_id uuid not null references public.robots(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  source text not null check (source in ('training','data','deployment','reward','academy','admin-adjustment')),
  amount integer not null check (amount <> 0),
  reference_type text not null,
  reference_id text not null,
  idempotency_key text not null unique,
  reversal_of uuid unique references public.robot_xp_events(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (reversal_of is null or amount < 0)
);
create index if not exists robot_xp_events_robot_time_idx on public.robot_xp_events(robot_id, created_at, id);

create table if not exists public.robot_public_passports (
  robot_id uuid primary key references public.robots(id) on delete cascade,
  public_verification_id uuid not null unique,
  name text not null,
  robot_class text not null,
  package_slug text not null,
  lifecycle text not null,
  activation_date timestamptz not null,
  level integer not null default 1 check (level > 0),
  total_xp integer not null default 0 check (total_xp >= 0),
  issued_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.capability_catalog(slug, description) values
  ('robot.core','Core digital robot identity and configuration'),
  ('training.basic','Basic training'),
  ('data.basic','Basic data contribution'),
  ('marketplace.basic','Marketplace access'),
  ('deployment.standard','Standard deployment eligibility'),
  ('deployment.regulated','Regulated deployment eligibility'),
  ('voice.custom','Custom voice profile'),
  ('tuning.advanced','Advanced tuning above standard limits'),
  ('analytics.advanced','Advanced analytics'),
  ('robot.elite-modules','Elite module variants'),
  ('robot.visionary-modules','Visionary module variants')
on conflict (slug) do nothing;

insert into public.package_capabilities(package_slug, capability_slug) values
  ('starter','robot.core'),('starter','training.basic'),('starter','data.basic'),
  ('builder','robot.core'),('builder','training.basic'),('builder','data.basic'),('builder','marketplace.basic'),
  ('professional','robot.core'),('professional','training.basic'),('professional','data.basic'),('professional','marketplace.basic'),('professional','deployment.standard'),('professional','voice.custom'),('professional','tuning.advanced'),
  ('enterprise','robot.core'),('enterprise','training.basic'),('enterprise','data.basic'),('enterprise','marketplace.basic'),('enterprise','deployment.standard'),('enterprise','deployment.regulated'),('enterprise','voice.custom'),('enterprise','tuning.advanced'),('enterprise','analytics.advanced'),
  ('elite','robot.core'),('elite','training.basic'),('elite','data.basic'),('elite','marketplace.basic'),('elite','deployment.standard'),('elite','deployment.regulated'),('elite','voice.custom'),('elite','tuning.advanced'),('elite','analytics.advanced'),('elite','robot.elite-modules'),
  ('visionary','robot.core'),('visionary','training.basic'),('visionary','data.basic'),('visionary','marketplace.basic'),('visionary','deployment.standard'),('visionary','deployment.regulated'),('visionary','voice.custom'),('visionary','tuning.advanced'),('visionary','analytics.advanced'),('visionary','robot.elite-modules'),('visionary','robot.visionary-modules')
on conflict do nothing;

alter table public.robots enable row level security;
alter table public.robot_onboarding enable row level security;
alter table public.package_entitlements enable row level security;
alter table public.robot_configurations enable row level security;
alter table public.capability_catalog enable row level security;
alter table public.package_capabilities enable row level security;
alter table public.robot_skills enable row level security;
alter table public.robot_certifications enable row level security;
alter table public.robot_history_events enable row level security;
alter table public.robot_xp_events enable row level security;
alter table public.robot_public_passports enable row level security;

create policy robots_select_own on public.robots for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy robot_onboarding_select_own on public.robot_onboarding for select to authenticated
  using (user_id = (select auth.uid()));
create policy package_entitlements_select_own on public.package_entitlements for select to authenticated
  using (user_id = (select auth.uid()));
create policy robot_configurations_select_own on public.robot_configurations for select to authenticated
  using (exists (select 1 from public.robots r where r.id = robot_id and r.owner_user_id = (select auth.uid())));
create policy robot_skills_select_own on public.robot_skills for select to authenticated
  using (exists (select 1 from public.robots r where r.id = robot_id and r.owner_user_id = (select auth.uid())));
create policy robot_certifications_select_own on public.robot_certifications for select to authenticated
  using (exists (select 1 from public.robots r where r.id = robot_id and r.owner_user_id = (select auth.uid())));
create policy robot_history_select_own on public.robot_history_events for select to authenticated
  using (exists (select 1 from public.robots r where r.id = robot_id and r.owner_user_id = (select auth.uid())));
create policy robot_xp_select_own on public.robot_xp_events for select to authenticated
  using (user_id = (select auth.uid()));
create policy robot_public_passport_read on public.robot_public_passports for select to anon, authenticated
  using (true);

revoke insert, update, delete on public.robots from anon, authenticated;
revoke insert, update, delete on public.robot_onboarding from anon, authenticated;
revoke insert, update, delete on public.package_entitlements from anon, authenticated;
revoke insert, update, delete on public.robot_configurations from anon, authenticated;
revoke insert, update, delete on public.robot_skills from anon, authenticated;
revoke insert, update, delete on public.robot_certifications from anon, authenticated;
revoke insert, update, delete on public.robot_history_events from anon, authenticated;
revoke insert, update, delete on public.robot_xp_events from anon, authenticated;
revoke insert, update, delete on public.robot_public_passports from anon, authenticated;

create or replace function public.wrs_reject_robot_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'WRS robot history and XP events are append-only';
end;
$$;

drop trigger if exists robot_history_events_append_only on public.robot_history_events;
create trigger robot_history_events_append_only
before update or delete on public.robot_history_events
for each row execute function public.wrs_reject_robot_event_mutation();

drop trigger if exists robot_xp_events_append_only on public.robot_xp_events;
create trigger robot_xp_events_append_only
before update or delete on public.robot_xp_events
for each row execute function public.wrs_reject_robot_event_mutation();

comment on table public.robot_xp_events is 'Append-only, idempotent XP ledger. Corrections are compensating reversal events, never edits/deletes.';
comment on table public.robot_public_passports is 'Privacy-safe public passport verification projection; contains no owner PII or financial data.';
