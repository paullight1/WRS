-- Plan 3 review hardening: privileged identity/security fields are never
-- directly mutable by browser-authenticated roles. All mutation flows pass
-- through server/service-role operations that re-authorize the request.

drop policy if exists user_profiles_update_own on public.user_profiles;
drop policy if exists user_devices_own on public.user_devices;
drop policy if exists security_events_select_own on public.security_events;

create policy user_devices_select_own
  on public.user_devices
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Authenticated clients may read their own identity/session/factor state, but
-- cannot set status, verification timestamps, KYC state, trusted devices,
-- roles, sessions or security audit records directly.
revoke insert, update, delete on public.user_profiles from anon, authenticated;
revoke insert, update, delete on public.user_identities from anon, authenticated;
revoke insert, update, delete on public.user_sessions from anon, authenticated;
revoke insert, update, delete on public.user_devices from anon, authenticated;
revoke insert, update, delete on public.user_roles from anon, authenticated;
revoke insert, update, delete on public.user_mfa_factors from anon, authenticated;
revoke all on public.security_events from anon, authenticated;

create index if not exists user_sessions_active_user_idx
  on public.user_sessions(user_id, expires_at desc)
  where revoked_at is null;

create index if not exists user_devices_user_last_seen_idx
  on public.user_devices(user_id, last_seen_at desc);

create index if not exists password_reset_requests_user_created_idx
  on public.password_reset_requests(user_id, created_at desc);

create index if not exists user_mfa_factors_user_status_idx
  on public.user_mfa_factors(user_id, status);

create or replace function public.wrs_reject_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'WRS security audit events are append-only';
end;
$$;

drop trigger if exists security_events_append_only on public.security_events;
create trigger security_events_append_only
before update or delete on public.security_events
for each row execute function public.wrs_reject_audit_mutation();

comment on table public.security_events is
  'Append-only security audit log. Browser roles have no direct access; server/service-role writes only.';
