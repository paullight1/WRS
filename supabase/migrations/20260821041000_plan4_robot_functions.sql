-- Plan 4 atomic database operations. These functions are intentionally
-- service-role-only: browser clients use same-origin WRS API endpoints, and
-- the server derives p_user_id from the verified session before calling them.

create or replace function public.wrs_complete_robot_onboarding(
  p_user_id uuid,
  p_input jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_package text := p_input->>'requestedPackageSlug';
  v_robot public.robots%rowtype;
  v_config public.robot_configurations%rowtype;
  v_existing_key text;
  v_robot_class text;
begin
  if p_user_id is null or nullif(trim(p_idempotency_key), '') is null then
    raise exception 'user and idempotency key are required';
  end if;

  if v_package not in ('starter','builder','professional','enterprise','elite','visionary') then
    raise exception 'invalid package';
  end if;

  select o.completion_idempotency_key, r.*
    into v_existing_key, v_robot
  from public.robot_onboarding o
  left join public.robots r on r.id = o.completed_robot_id
  where o.user_id = p_user_id
  for update of o;

  if v_existing_key = p_idempotency_key and v_robot.id is not null then
    select * into v_config
    from public.robot_configurations
    where robot_id = v_robot.id;

    return jsonb_build_object(
      'status', 'already-completed',
      'robotId', v_robot.id,
      'configurationVersion', v_config.version
    );
  end if;

  if v_robot.id is not null then
    return jsonb_build_object(
      'status', 'already-completed',
      'robotId', v_robot.id,
      'reason', 'one-robot-per-owner'
    );
  end if;

  if not exists (
    select 1
    from public.package_entitlements e
    where e.user_id = p_user_id
      and e.status = 'active'
      and e.package_slug = v_package
      and (e.expires_at is null or e.expires_at > now())
  ) then
    return jsonb_build_object('status', 'entitlement-required', 'packageSlug', v_package);
  end if;

  v_robot_class := case v_package
    when 'starter' then 'Explorer Robot'
    when 'builder' then 'Worker Robot'
    when 'professional' then 'Professional Robot'
    when 'enterprise' then 'Enterprise Robot'
    when 'elite' then 'Elite Robot'
    else 'Visionary Robot'
  end;

  insert into public.robots(
    owner_user_id,
    name,
    lifecycle,
    package_slug,
    requested_package_slug
  ) values (
    p_user_id,
    trim(p_input->>'name'),
    'active',
    v_package,
    v_package
  )
  returning * into v_robot;

  insert into public.robot_configurations(
    robot_id,
    palette,
    parts,
    personality,
    tuning,
    voice_profile_id
  ) values (
    v_robot.id,
    p_input->>'palette',
    coalesce(p_input->'parts', '{}'::jsonb),
    p_input->>'personality',
    coalesce(p_input->'tuning', '{}'::jsonb),
    p_input->>'voiceProfileId'
  )
  returning * into v_config;

  insert into public.robot_onboarding(
    user_id,
    step,
    draft,
    completion_idempotency_key,
    completed_robot_id,
    updated_at
  ) values (
    p_user_id,
    5,
    p_input,
    p_idempotency_key,
    v_robot.id,
    now()
  )
  on conflict (user_id) do update
    set step = excluded.step,
        draft = excluded.draft,
        completion_idempotency_key = excluded.completion_idempotency_key,
        completed_robot_id = excluded.completed_robot_id,
        updated_at = now();

  insert into public.robot_public_passports(
    robot_id,
    public_verification_id,
    name,
    robot_class,
    package_slug,
    lifecycle,
    activation_date,
    level,
    total_xp
  ) values (
    v_robot.id,
    v_robot.public_verification_id,
    v_robot.name,
    v_robot_class,
    v_robot.package_slug,
    v_robot.lifecycle,
    v_robot.activation_date,
    1,
    0
  );

  insert into public.robot_history_events(robot_id, event_type, public_summary, metadata)
  values (
    v_robot.id,
    'robot.provisioned',
    'Robot provisioned',
    jsonb_build_object('packageSlug', v_robot.package_slug)
  );

  return jsonb_build_object(
    'status', 'completed',
    'robotId', v_robot.id,
    'configurationVersion', v_config.version
  );
end;
$$;

revoke all on function public.wrs_complete_robot_onboarding(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.wrs_complete_robot_onboarding(uuid, jsonb, text) to service_role;

create or replace function public.wrs_save_robot_configuration(
  p_user_id uuid,
  p_robot_id uuid,
  p_input jsonb,
  p_expected_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_robot public.robots%rowtype;
  v_current public.robot_configurations%rowtype;
  v_required text[] := array['robot.core'];
  v_cap text;
  v_value text;
begin
  select * into v_robot
  from public.robots
  where id = p_robot_id and owner_user_id = p_user_id and lifecycle = 'active';

  if v_robot.id is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into v_current
  from public.robot_configurations
  where robot_id = p_robot_id
  for update;

  if v_current.version <> p_expected_version then
    return jsonb_build_object(
      'status', 'conflict',
      'currentVersion', v_current.version
    );
  end if;

  if lower(coalesce(p_input->>'voiceProfileId', '')) like '%custom%' then
    v_required := array_append(v_required, 'voice.custom');
  end if;

  if coalesce((p_input->'tuning'->>'speed')::numeric, 0) > 90
     or coalesce((p_input->'tuning'->>'battery')::numeric, 0) > 90
     or coalesce((p_input->'tuning'->>'sensor')::numeric, 0) > 90 then
    v_required := array_append(v_required, 'tuning.advanced');
  end if;

  for v_value in select value from jsonb_each_text(coalesce(p_input->'parts', '{}'::jsonb)) loop
    if lower(v_value) like '%visionary%' then
      v_required := array_append(v_required, 'robot.visionary-modules');
    elsif lower(v_value) like '%elite%' then
      v_required := array_append(v_required, 'robot.elite-modules');
    end if;
  end loop;

  foreach v_cap in array v_required loop
    if not exists (
      select 1
      from public.package_capabilities pc
      where pc.package_slug = v_robot.package_slug
        and pc.capability_slug = v_cap
    ) then
      return jsonb_build_object('status', 'capability-locked', 'capability', v_cap);
    end if;
  end loop;

  update public.robot_configurations
  set version = version + 1,
      palette = p_input->>'palette',
      parts = coalesce(p_input->'parts', parts),
      personality = p_input->>'personality',
      tuning = coalesce(p_input->'tuning', tuning),
      voice_profile_id = p_input->>'voiceProfileId',
      updated_at = now()
  where robot_id = p_robot_id
  returning * into v_current;

  insert into public.robot_history_events(robot_id, event_type, public_summary, metadata)
  values (
    p_robot_id,
    'robot.configuration.updated',
    'Robot configuration updated',
    jsonb_build_object('version', v_current.version)
  );

  return jsonb_build_object('status', 'saved', 'configurationVersion', v_current.version);
end;
$$;

revoke all on function public.wrs_save_robot_configuration(uuid, uuid, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.wrs_save_robot_configuration(uuid, uuid, jsonb, bigint) to service_role;

create or replace function public.wrs_append_robot_xp_event(
  p_user_id uuid,
  p_event jsonb
)
returns public.robot_xp_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_robot_id uuid := (p_event->>'robotId')::uuid;
  v_event_id uuid := (p_event->>'id')::uuid;
  v_reversal_of uuid := nullif(p_event->>'reversalOf', '')::uuid;
  v_amount integer := (p_event->>'amount')::integer;
  v_original public.robot_xp_events%rowtype;
  v_result public.robot_xp_events%rowtype;
begin
  if not exists (
    select 1 from public.robots r
    where r.id = v_robot_id and r.owner_user_id = p_user_id
  ) then
    raise exception 'robot ownership mismatch';
  end if;

  if v_reversal_of is null and v_amount <= 0 then
    raise exception 'XP award must be positive';
  end if;

  if v_reversal_of is not null then
    select * into v_original
    from public.robot_xp_events
    where id = v_reversal_of
      and robot_id = v_robot_id
      and user_id = p_user_id
      and reversal_of is null
    for update;

    if v_original.id is null then
      raise exception 'original XP event not found';
    end if;
    if exists (select 1 from public.robot_xp_events where reversal_of = v_reversal_of) then
      raise exception 'XP event already reversed';
    end if;
    if v_amount <> -v_original.amount then
      raise exception 'reversal amount mismatch';
    end if;
  end if;

  insert into public.robot_xp_events(
    id,
    robot_id,
    user_id,
    source,
    amount,
    reference_type,
    reference_id,
    idempotency_key,
    reversal_of,
    metadata,
    created_at
  ) values (
    v_event_id,
    v_robot_id,
    p_user_id,
    p_event->>'source',
    v_amount,
    p_event->>'referenceType',
    p_event->>'referenceId',
    p_event->>'idempotencyKey',
    v_reversal_of,
    coalesce(p_event->'metadata', '{}'::jsonb),
    coalesce((p_event->>'createdAt')::timestamptz, now())
  )
  on conflict (idempotency_key) do nothing
  returning * into v_result;

  if v_result.id is null then
    select * into v_result
    from public.robot_xp_events
    where idempotency_key = p_event->>'idempotencyKey';

    if v_result.robot_id <> v_robot_id or v_result.user_id <> p_user_id then
      raise exception 'idempotency key collision';
    end if;
  end if;

  return v_result;
end;
$$;

revoke all on function public.wrs_append_robot_xp_event(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.wrs_append_robot_xp_event(uuid, jsonb) to service_role;
