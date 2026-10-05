-- Keep mining focused on the member's single free robot slot. Paid slot unlocks
-- are not available yet. Worksites remain optional until the worksite product is ready.

create or replace function public.wrs_mining_snapshot(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_snapshot jsonb;
begin
  perform public.wrs_mining_assert_service_role();
  v_snapshot := public.wrs_mining_snapshot_foundation(p_user_id);
  return v_snapshot || jsonb_build_object(
    'robots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'robotId', ranked.id,
        'name', ranked.name,
        'lifecycle', ranked.lifecycle,
        'unlocked', ranked.lifecycle = 'active' and ranked.position = 1,
        'unlockRequirement', case
          when ranked.lifecycle <> 'active' then 'Robot must be active'
          when ranked.position > 1 then 'Additional robot slots are coming soon'
          else null end
      ) order by ranked.position)
      from (
        select r.id, r.name, r.lifecycle,
          row_number() over (order by r.created_at, r.id) as position
        from public.robots r where r.owner_user_id = p_user_id
      ) ranked
    ), '[]'::jsonb),
    'worksites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'worksiteId', w.id, 'name', w.name, 'description', w.description, 'available', true
      ) order by w.name, w.id)
      from public.mining_worksites w where w.status = 'approved'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.wrs_start_mining_session(
  p_user_id uuid, p_robot_id uuid, p_worksite_id uuid, p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_existing public.mining_sessions%rowtype;
  v_robot public.robots%rowtype;
  v_rule public.mining_rule_versions%rowtype;
  v_session public.mining_sessions%rowtype;
  v_snapshot jsonb;
  v_power bigint;
  v_level_power bigint;
  v_xp bigint;
  v_activities integer;
  v_level integer;
  v_rate numeric;
  v_economics public.mining_economics_config%rowtype;
  v_robot_position bigint;
begin
  perform public.wrs_mining_assert_service_role();
  if p_user_id is null or p_robot_id is null or nullif(trim(coalesce(p_idempotency_key,'')),'') is null or char_length(p_idempotency_key) > 200 then
    raise exception 'valid user, robot, and idempotency key are required';
  end if;

  perform 1 from public.user_profiles where user_id = p_user_id for update;
  if not found then raise exception 'account not found'; end if;
  select * into v_existing from public.mining_sessions
    where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then return public.wrs_mining_session_json(v_existing); end if;
  select * into v_existing from public.mining_sessions
    where user_id = p_user_id and status in ('active','ended') order by started_at desc limit 1 for update;
  if found then return public.wrs_mining_session_json(v_existing); end if;

  select * into v_robot from public.robots where id = p_robot_id and owner_user_id = p_user_id for update;
  if not found then raise exception 'robot ownership required'; end if;
  if v_robot.lifecycle <> 'active' then raise exception 'robot lifecycle must be active'; end if;
  select ranked.position into v_robot_position from (
    select r.id, row_number() over (order by r.created_at, r.id) as position
    from public.robots r where r.owner_user_id = p_user_id
  ) ranked where ranked.id = v_robot.id;
  if v_robot_position > 1 then
    raise exception 'additional robot slots are coming soon';
  end if;
  if p_worksite_id is not null and not exists(select 1 from public.mining_worksites where id = p_worksite_id and status = 'approved') then
    raise exception 'approved worksite required';
  end if;

  select * into v_rule from public.mining_rule_versions where status = 'active' and issuance_enabled order by version desc limit 1;
  select * into v_economics from public.mining_economics_config where singleton;
  if v_rule.id is null or not v_economics.issuance_enabled or v_economics.atomic_scale is null then
    raise exception 'mining issuance is not configured';
  end if;
  if v_economics.atomic_scale > 12 then raise exception 'unsupported issuance precision'; end if;
  select coalesce(sum(amount),0) into v_power from public.mining_power_events where user_id = p_user_id;
  v_power := greatest(0,v_power);
  select coalesce(sum(amount),0) into v_xp from public.robot_xp_events where robot_id = v_robot.id;
  select count(distinct reference_type || ':' || reference_id)::integer into v_activities from public.mining_power_events
    contribution where user_id = p_user_id and amount > 0 and source in ('data-task','academy','training') and reversal_of is null
      and not exists(select 1 from public.mining_power_events reversal where reversal.reversal_of = contribution.id);
  if v_activities < v_rule.minimum_verified_activities then raise exception 'verified contribution required'; end if;
  select greatest(1,coalesce((select (r->>'level')::integer from jsonb_array_elements(v_rule.level_rules) r
    where v_xp >= coalesce((r->>'requiredXp')::bigint,0)
      and v_activities >= coalesce((r->>'requiredVerifiedActivityCount')::integer,0)
      and jsonb_array_length(coalesce(r->'requiredAchievementCodes','[]'::jsonb)) = 0
    order by (r->>'level')::integer desc limit 1),1)) into v_level;
  select coalesce((select (r->>'miningPower')::bigint from jsonb_array_elements(v_rule.level_rules) r
    where (r->>'level')::integer = v_level),0) into v_level_power;
  v_power := v_power + greatest(0,v_level_power);
  v_rate := v_rule.base_rate_atomic_per_hour + v_power::numeric * v_rule.mining_power_bonus_atomic_per_hour;
  if v_rate > 9223372036854775807 then raise exception 'configured mining rate overflow'; end if;
  v_snapshot := jsonb_build_object(
    'ruleId',v_rule.id,'version',v_rule.version,'issuanceEnabled',v_rule.issuance_enabled,
    'baseRateAtomicPerHour',v_rule.base_rate_atomic_per_hour::text,
    'miningPowerBonusAtomicPerHour',v_rule.mining_power_bonus_atomic_per_hour::text,
    'rateAtomicPerHour',v_rate::bigint::text,'atomicUnitScale',v_rule.atomic_scale,
    'globalIssuanceCapAtomic',v_economics.global_issuance_cap_atomic::text,
    'perSessionCapAtomic',v_rule.per_session_cap_atomic::text,'perUserDailyCapAtomic',v_rule.per_user_daily_cap_atomic::text
  );
  insert into public.mining_sessions(user_id,robot_id,worksite_id,idempotency_key,rule_id,rule_version,started_at,ends_at,
    rate_atomic_per_hour,mining_power,miner_level,rule_snapshot,eligibility_snapshot)
  values(p_user_id,v_robot.id,p_worksite_id,p_idempotency_key,v_rule.id,v_rule.version,now(),now()+interval '24 hours',
    v_rate::bigint,v_power,jsonb_build_object('code','miner-'||v_level,'level',v_level),v_snapshot,
    jsonb_build_object('robotLifecycle',v_robot.lifecycle,'verifiedActivityCount',v_activities)) returning * into v_session;
  perform public.wrs_award_verified_mining_activity(p_user_id,v_robot.id,'mining-start','mining-session',v_session.id::text);
  return public.wrs_mining_session_json(v_session);
exception when unique_violation then
  select * into v_existing from public.mining_sessions
    where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then return public.wrs_mining_session_json(v_existing); end if;
  select * into v_existing from public.mining_sessions
    where user_id = p_user_id and status in ('active','ended') order by started_at desc limit 1;
  if found then return public.wrs_mining_session_json(v_existing); end if;
  raise;
end;
$$;

revoke all on function public.wrs_mining_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.wrs_start_mining_session(uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.wrs_mining_snapshot(uuid) to service_role;
grant execute on function public.wrs_start_mining_session(uuid,uuid,uuid,text) to service_role;
