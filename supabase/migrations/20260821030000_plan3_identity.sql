-- WRS Plan 3: authoritative identity, verification, session metadata, RBAC and MFA audit model.
create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  normalized_email text not null unique check (normalized_email = lower(trim(normalized_email))),
  normalized_phone text not null unique check (normalized_phone ~ '^\\+[1-9][0-9]{7,14}$'),
  status text not null default 'pending' check (status in ('pending','active','suspended','deleted')),
  terms_version text not null,
  privacy_version text not null,
  legal_accepted_at timestamptz not null default now(),
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  kyc_status text not null default 'unverified' check (kyc_status in ('unverified','pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  provider text not null check (provider in ('password','google','apple')),
  provider_subject text not null,
  provider_email text,
  created_at timestamptz not null default now(),
  unique(provider, provider_subject)
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  auth_session_id uuid unique,
  device_id uuid,
  remember_me boolean not null default false,
  mfa_satisfied_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  kind text not null check (kind in ('email','phone')),
  secret_hash text not null,
  expires_at timestamptz not null,
  resend_available_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  consumed_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists verification_requests_user_kind_idx on public.verification_requests(user_id, kind, created_at desc);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  label text,
  platform text,
  last_seen_at timestamptz not null default now(),
  trusted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.user_sessions drop constraint if exists user_sessions_device_id_fkey;
alter table public.user_sessions add constraint user_sessions_device_id_fkey foreign key (device_id) references public.user_devices(id) on delete set null;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  description text not null default ''
);
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  description text not null default ''
);
create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
create table if not exists public.user_roles (
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.user_profiles(user_id) on delete set null,
  primary key (user_id, role_id)
);

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.user_profiles(user_id) on delete set null,
  event_type text not null,
  ip_hash text,
  device_id uuid references public.user_devices(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists security_events_user_time_idx on public.security_events(user_id, occurred_at desc);

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.oauth_login_states (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google','apple')),
  state_hash text not null unique,
  nonce_hash text not null,
  pkce_verifier_hash text not null,
  redirect_uri text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  provider_factor_id text not null unique,
  kind text not null default 'totp' check (kind = 'totp'),
  status text not null default 'pending' check (status in ('pending','verified','disabled')),
  verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  code_hash text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

insert into public.roles(slug, description) values ('user','Standard WRS account'),('admin','WRS operator') on conflict (slug) do nothing;
insert into public.permissions(slug, description) values ('account.read','Read own account'),('account.manage','Manage own account'),('admin.access','Access operator surfaces') on conflict (slug) do nothing;

alter table public.user_profiles enable row level security;
alter table public.user_identities enable row level security;
alter table public.user_sessions enable row level security;
alter table public.verification_requests enable row level security;
alter table public.user_devices enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.security_events enable row level security;
alter table public.password_reset_requests enable row level security;
alter table public.oauth_login_states enable row level security;
alter table public.user_mfa_factors enable row level security;
alter table public.mfa_recovery_codes enable row level security;

revoke all on public.verification_requests, public.password_reset_requests, public.oauth_login_states, public.mfa_recovery_codes from anon, authenticated;

create policy user_profiles_select_own on public.user_profiles for select to authenticated using (user_id = auth.uid());
create policy user_profiles_update_own on public.user_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_identities_select_own on public.user_identities for select to authenticated using (user_id = auth.uid());
create policy user_sessions_select_own on public.user_sessions for select to authenticated using (user_id = auth.uid());
create policy user_devices_own on public.user_devices for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_mfa_factors_select_own on public.user_mfa_factors for select to authenticated using (user_id = auth.uid());
create policy security_events_select_own on public.security_events for select to authenticated using (user_id = auth.uid());

-- All credential verification, reset, OAuth-state consumption, MFA recovery-code
-- redemption, role grants and security-event writes are server/service-role operations.
