-- Free robots require no payment entitlement. Paid tiers retain their existing checks.
begin;

alter table public.robots drop constraint robots_package_slug_check;
alter table public.robots add constraint robots_package_slug_check
  check (package_slug in ('free','starter','builder','professional','enterprise','elite','visionary'));
alter table public.robots drop constraint robots_requested_package_slug_check;
alter table public.robots add constraint robots_requested_package_slug_check
  check (requested_package_slug in ('free','starter','builder','professional','enterprise','elite','visionary'));
alter table public.package_capabilities drop constraint package_capabilities_package_slug_check;
alter table public.package_capabilities add constraint package_capabilities_package_slug_check
  check (package_slug in ('free','starter','builder','professional','enterprise','elite','visionary'));

insert into public.package_capabilities(package_slug, capability_slug) values
  ('free','robot.core'), ('free','training.basic'), ('free','data.basic')
on conflict do nothing;

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
  v_completed_robot_id uuid;
  v_robot_class text;
  v_required text[] := array['robot.core'];
  v_cap text;
  v_value text;
begin
  if p_user_id is null or nullif(trim(p_idempotency_key), '') is null then
    raise exception 'user and idempotency key are required';
  end if;

  -- Serialize provisioning per user so concurrent retries cannot create two
  -- robots or split onboarding/configuration/passport state.
  perform 1
  from public.user_profiles
  where user_id = p_user_id
  for update;
  if not found then
    raise exception 'user not found';
  end if;

  if v_package not in ('free','starter','builder','professional','enterprise','elite','visionary') then
    raise exception 'invalid package';
  end if;

  select o.completion_idempotency_key, o.completed_robot_id
    into v_existing_key, v_completed_robot_id
  from public.robot_onboarding o
  where o.user_id = p_user_id
  for update;

  if v_completed_robot_id is not null then
    select * into v_robot
    from public.robots
    where id = v_completed_robot_id;
  end if;

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

  if v_robot.id is null then
    select * into v_robot
    from public.robots
    where owner_user_id = p_user_id;
  end if;

  if v_robot.id is not null then
    return jsonb_build_object(
      'status', 'already-completed',
      'robotId', v_robot.id,
      'reason', 'one-robot-per-owner'
    );
  end if;

  if v_package <> 'free' and not exists (
    select 1
    from public.package_entitlements e
    where e.user_id = p_user_id
      and e.status = 'active'
      and e.package_slug = v_package
      and (e.expires_at is null or e.expires_at > now())
  ) then
    return jsonb_build_object('status', 'entitlement-required', 'packageSlug', v_package);
  end if;

  if lower(coalesce(p_input->>'voiceProfileId', '')) like '%custom%' then
    v_required := array_append(v_required, 'voice.custom');
  end if;

  if coalesce((p_input->'tuning'->>'speed')::numeric, 0) > 90
     or coalesce((p_input->'tuning'->>'battery')::numeric, 0) > 90
     or coalesce((p_input->'tuning'->>'sensor')::numeric, 0) > 90 then
    v_required := array_append(v_required, 'tuning.advanced');
  end if;

  for v_value in
    select value from jsonb_each_text(coalesce(p_input->'parts', '{}'::jsonb))
  loop
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
      where pc.package_slug = v_package
        and pc.capability_slug = v_cap
    ) then
      return jsonb_build_object('status', 'capability-locked', 'capability', v_cap);
    end if;
  end loop;

  v_robot_class := case v_package
    when 'free' then 'Basic Robot'
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

commit;
