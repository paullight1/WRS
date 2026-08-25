-- Plan 8 portability hardening: referral code generation must work with an
-- empty search_path and must not depend on an extension schema location.
create or replace function public.wrs_ensure_referral_profile(p_user_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare
  v_code text;
  v_attempt integer;
begin
  select code into v_code from public.referral_profiles where user_id=p_user_id and status='active';
  if v_code is not null then return v_code; end if;

  for v_attempt in 1..5 loop
    v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
    begin
      insert into public.referral_profiles(user_id,code,status)
      values(p_user_id,v_code,'active')
      on conflict(user_id) do update set status='active'
      returning code into v_code;
      return v_code;
    exception when unique_violation then
      -- A code collision is extraordinarily unlikely, but retry instead of
      -- allowing another account's referral identity to leak or overwrite.
      null;
    end;
  end loop;

  raise exception 'could not allocate a unique referral code';
end;
$$;

revoke all on function public.wrs_ensure_referral_profile(uuid) from public,anon,authenticated;
grant execute on function public.wrs_ensure_referral_profile(uuid) to service_role;
