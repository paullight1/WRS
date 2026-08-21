-- Plan 3 atomic single-use security operations.

create or replace function public.wrs_consume_verification_attempt(
  p_request_id uuid,
  p_user_id uuid,
  p_kind text,
  p_secret_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.verification_requests%rowtype;
begin
  select * into v_row
  from public.verification_requests
  where id = p_request_id
    and user_id = p_user_id
    and kind = p_kind
  for update;

  if v_row.id is null
     or v_row.secret_hash <> p_secret_hash
     or v_row.consumed_at is not null
     or v_row.superseded_at is not null
     or v_row.expires_at <= now()
     or v_row.attempt_count >= 10 then
    return false;
  end if;

  update public.verification_requests
  set attempt_count = attempt_count + 1
  where id = p_request_id;

  return true;
end;
$$;

revoke all on function public.wrs_consume_verification_attempt(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.wrs_consume_verification_attempt(uuid, uuid, text, text)
  to service_role;

create or replace function public.wrs_consume_mfa_recovery_code(
  p_user_id uuid,
  p_code_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.mfa_recovery_codes
  set used_at = now()
  where user_id = p_user_id
    and code_hash = p_code_hash
    and used_at is null
  returning id into v_id;

  return v_id is not null;
end;
$$;

revoke all on function public.wrs_consume_mfa_recovery_code(uuid, text)
  from public, anon, authenticated;
grant execute on function public.wrs_consume_mfa_recovery_code(uuid, text)
  to service_role;

comment on function public.wrs_consume_verification_attempt(uuid, uuid, text, text) is
  'Atomically validates and consumes one OTP verification attempt.';
comment on function public.wrs_consume_mfa_recovery_code(uuid, text) is
  'Atomically redeems one hashed MFA recovery code.';
