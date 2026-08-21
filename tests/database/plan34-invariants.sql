\set ON_ERROR_STOP on

DO $$
DECLARE
  relation_name text;
  routine_name text;
  function_definition text;
BEGIN
  foreach relation_name in array ARRAY[
    'public.user_profiles',
    'public.user_identities',
    'public.verification_requests',
    'public.user_sessions',
    'public.user_devices',
    'public.security_events',
    'public.robots',
    'public.robot_onboarding',
    'public.package_entitlements',
    'public.robot_configurations',
    'public.capability_catalog',
    'public.package_capabilities',
    'public.robot_skills',
    'public.robot_certifications',
    'public.robot_history_events',
    'public.robot_xp_events',
    'public.robot_public_passports'
  ] loop
    if to_regclass(relation_name) is null then
      raise exception 'missing required relation: %', relation_name;
    end if;
  end loop;

  foreach relation_name in array ARRAY[
    'user_profiles',
    'user_identities',
    'verification_requests',
    'user_sessions',
    'user_devices',
    'security_events',
    'robots',
    'robot_onboarding',
    'package_entitlements',
    'robot_configurations',
    'robot_skills',
    'robot_certifications',
    'robot_history_events',
    'robot_xp_events',
    'robot_public_passports'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = relation_name
        and c.relrowsecurity = true
    ) then
      raise exception 'RLS is not enabled on public.%', relation_name;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.user_profiles', 'UPDATE') then
    raise exception 'authenticated role must not update user_profiles directly';
  end if;
  if has_table_privilege('authenticated', 'public.security_events', 'INSERT')
     or has_table_privilege('authenticated', 'public.security_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.security_events', 'DELETE') then
    raise exception 'authenticated role must not mutate security_events';
  end if;
  if has_table_privilege('authenticated', 'public.robots', 'INSERT')
     or has_table_privilege('authenticated', 'public.robots', 'UPDATE')
     or has_table_privilege('authenticated', 'public.robots', 'DELETE') then
    raise exception 'authenticated role must not mutate robots directly';
  end if;
  if has_table_privilege('authenticated', 'public.robot_xp_events', 'INSERT')
     or has_table_privilege('authenticated', 'public.robot_xp_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.robot_xp_events', 'DELETE') then
    raise exception 'authenticated role must not mutate robot_xp_events directly';
  end if;

  if to_regclass('public.robot_xp_events_source_reference_idx') is null then
    raise exception 'missing unique source/reference XP index';
  end if;
  if to_regclass('public.robot_xp_events_robot_time_idx') is null then
    raise exception 'missing robot XP time index';
  end if;
  if to_regclass('public.package_entitlements_one_active_idx') is null then
    raise exception 'missing one-active-entitlement index';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'security_events_append_only'
      and not tgisinternal
  ) then
    raise exception 'security audit append-only trigger is missing';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'robot_history_events_append_only'
      and not tgisinternal
  ) then
    raise exception 'robot history append-only trigger is missing';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'robot_xp_events_append_only'
      and not tgisinternal
  ) then
    raise exception 'robot XP append-only trigger is missing';
  end if;

  foreach routine_name in array ARRAY[
    'public.wrs_complete_robot_onboarding(uuid,jsonb,text)',
    'public.wrs_save_robot_configuration(uuid,uuid,jsonb,bigint)',
    'public.wrs_append_robot_xp_event(uuid,jsonb)',
    'public.wrs_get_robot_passport(uuid,uuid)'
  ] loop
    if to_regprocedure(routine_name) is null then
      raise exception 'missing service routine: %', routine_name;
    end if;
    if not has_function_privilege('service_role', routine_name, 'EXECUTE') then
      raise exception 'service_role cannot execute %', routine_name;
    end if;
    if has_function_privilege('authenticated', routine_name, 'EXECUTE')
       or has_function_privilege('anon', routine_name, 'EXECUTE') then
      raise exception 'browser role can execute privileged routine %', routine_name;
    end if;
  end loop;

  if to_regprocedure('public.wrs_verify_robot_passport(uuid)') is null then
    raise exception 'missing public passport verification function';
  end if;
  if not has_function_privilege('anon', 'public.wrs_verify_robot_passport(uuid)', 'EXECUTE') then
    raise exception 'anon cannot execute privacy-safe passport verification';
  end if;

  if public.wrs_robot_level_for_xp(0) <> 1
     or public.wrs_robot_level_for_xp(99) <> 1
     or public.wrs_robot_level_for_xp(100) <> 2
     or public.wrs_robot_level_for_xp(250) <> 3
     or public.wrs_robot_level_for_xp(1000) <> 6
     or public.wrs_robot_level_for_xp(11000) <> 16 then
    raise exception 'database XP level thresholds do not match the domain model';
  end if;

  if public.wrs_verify_robot_passport('00000000-0000-0000-0000-000000000001'::uuid) is not null then
    raise exception 'unknown public verification ID must return null';
  end if;

  select pg_get_functiondef(to_regprocedure('public.wrs_complete_robot_onboarding(uuid,jsonb,text)'))
    into function_definition;
  if position('FOR UPDATE' in upper(function_definition)) = 0
     or position('PACKAGE_ENTITLEMENTS' in upper(function_definition)) = 0 then
    raise exception 'onboarding routine is missing serialization or entitlement enforcement';
  end if;

  select pg_get_functiondef(to_regprocedure('public.wrs_verify_robot_passport(uuid)'))
    into function_definition;
  if position('OWNER_USER_ID' in upper(function_definition)) > 0
     or position('WALLET' in upper(function_definition)) > 0
     or position('BALANCE' in upper(function_definition)) > 0
     or position('PAYMENT' in upper(function_definition)) > 0 then
    raise exception 'public passport verification contains private identity/financial fields';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = to_regprocedure('public.wrs_complete_robot_onboarding(uuid,jsonb,text)')
      and p.prosecdef = true
  ) then
    raise exception 'onboarding routine is not SECURITY DEFINER';
  end if;
END
$$;

select 'Plans 3-4 database invariants verified' as result;
