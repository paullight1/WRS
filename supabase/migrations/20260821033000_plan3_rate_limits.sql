-- Plan 3 distributed authentication throttling. Callers HMAC identifiers and
-- network signals before they reach PostgreSQL so raw email/phone/IP values are
-- never persisted in the rate-limit table.

create table if not exists public.auth_rate_limit_buckets (
  action text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (action, subject_hash)
);

alter table public.auth_rate_limit_buckets enable row level security;
revoke all on public.auth_rate_limit_buckets from public, anon, authenticated;

create or replace function public.wrs_consume_auth_rate_limit(
  p_action text,
  p_subject_hash text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_row public.auth_rate_limit_buckets%rowtype;
begin
  if nullif(trim(p_action), '') is null
     or nullif(trim(p_subject_hash), '') is null
     or p_window_seconds < 1
     or p_limit < 1 then
    raise exception 'invalid rate-limit parameters';
  end if;

  insert into public.auth_rate_limit_buckets(
    action,
    subject_hash,
    window_started_at,
    attempt_count,
    updated_at
  ) values (
    p_action,
    p_subject_hash,
    v_now,
    0,
    v_now
  )
  on conflict (action, subject_hash) do nothing;

  select * into v_row
  from public.auth_rate_limit_buckets
  where action = p_action and subject_hash = p_subject_hash
  for update;

  if v_row.window_started_at + make_interval(secs => p_window_seconds) <= v_now then
    update public.auth_rate_limit_buckets
    set window_started_at = v_now,
        attempt_count = 1,
        updated_at = v_now
    where action = p_action and subject_hash = p_subject_hash;
    return true;
  end if;

  if v_row.attempt_count >= p_limit then
    return false;
  end if;

  update public.auth_rate_limit_buckets
  set attempt_count = attempt_count + 1,
      updated_at = v_now
  where action = p_action and subject_hash = p_subject_hash;

  return true;
end;
$$;

revoke all on function public.wrs_consume_auth_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.wrs_consume_auth_rate_limit(text, text, integer, integer)
  to service_role;

comment on table public.auth_rate_limit_buckets is
  'Distributed auth throttling buckets keyed only by server-HMACed subjects.';
