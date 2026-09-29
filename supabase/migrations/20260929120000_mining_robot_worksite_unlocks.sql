-- Plan 12: bind every new cycle to one owned robot and an approved worksite.
-- No worksite or reward rule is seeded here; staff must approve real sites and
-- configure economics before members can start earning.

alter table public.robots drop constraint if exists robots_owner_user_id_key;
create index if not exists robots_owner_created_idx on public.robots(owner_user_id, created_at, id);

create table public.mining_worksites (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','suspended','retired')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'approved') = (approved_at is not null))
);
create index mining_worksites_approved_idx on public.mining_worksites(status, name) where status = 'approved';
alter table public.mining_worksites enable row level security;
revoke all on public.mining_worksites from public, anon, authenticated, service_role;
grant select on public.mining_worksites to service_role;

alter table public.mining_sessions
  add column worksite_id uuid references public.mining_worksites(id) on delete restrict;
create index mining_sessions_worksite_history_idx on public.mining_sessions(worksite_id, started_at desc);
create unique index mining_sessions_one_open_per_user_idx on public.mining_sessions(user_id)
  where status in ('active','ended');

create or replace function public.wrs_mining_session_immutability_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'mining sessions cannot be deleted'; end if;
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.robot_id is distinct from old.robot_id or new.worksite_id is distinct from old.worksite_id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.rule_id is distinct from old.rule_id or new.rule_version is distinct from old.rule_version
    or new.started_at is distinct from old.started_at or new.ends_at is distinct from old.ends_at
    or new.rate_atomic_per_hour is distinct from old.rate_atomic_per_hour
    or new.mining_power is distinct from old.mining_power or new.miner_level is distinct from old.miner_level
    or new.rule_snapshot is distinct from old.rule_snapshot or new.eligibility_snapshot is distinct from old.eligibility_snapshot
    or new.created_at is distinct from old.created_at then
    raise exception 'mining session snapshot is immutable';
  end if;
  if new.status is distinct from old.status and not (
    (old.status='active' and new.status in ('ended','cancelled')) or (old.status='ended' and new.status='settled')
  ) then raise exception 'invalid mining session status transition'; end if;
  if new.status <> 'settled' and (new.settled_at is not null or new.earned_atomic is not null) then
    raise exception 'settlement fields require settled status';
  end if;
  return new;
end;
$$;

create or replace function public.wrs_mining_session_json(p_session public.mining_sessions)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', (p_session).id,
    'status', (p_session).status,
    'startedAt', (p_session).started_at,
    'endsAt', (p_session).ends_at,
    'settledAt', (p_session).settled_at,
    'robotId', (p_session).robot_id,
    'worksiteId', (p_session).worksite_id,
    'rule', (p_session).rule_snapshot,
    'level', (p_session).miner_level,
    'miningPower', (p_session).mining_power,
    'estimatedAwardAtomic', (p_session).earned_atomic::text,
    'awardTransactionId', (select a.ledger_transaction_id from public.mining_session_awards a where a.session_id = (p_session).id)
  )
$$;

-- Keep the foundation snapshot implementation and add the member's owned choices.
alter function public.wrs_mining_snapshot(uuid) rename to wrs_mining_snapshot_foundation;
create function public.wrs_mining_snapshot(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_snapshot jsonb;
  v_settled_cycles bigint;
begin
  perform public.wrs_mining_assert_service_role();
  v_snapshot := public.wrs_mining_snapshot_foundation(p_user_id);
  select count(*) into v_settled_cycles from public.mining_sessions
    where user_id = p_user_id and status = 'settled'
      and ends_at = started_at + interval '24 hours';
  return v_snapshot || jsonb_build_object(
    'robots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'robotId', ranked.id,
        'name', ranked.name,
        'lifecycle', ranked.lifecycle,
        'unlocked', ranked.lifecycle = 'active' and ranked.position <= v_settled_cycles + 1,
        'unlockRequirement', case
          when ranked.lifecycle <> 'active' then 'Robot must be active'
          when ranked.position > v_settled_cycles + 1 then 'Complete one full 24-hour mining cycle with the previous robots first'
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

drop function public.wrs_start_mining_session(uuid, text);
create function public.wrs_start_mining_session(
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
  v_settled_cycles bigint;
begin
  perform public.wrs_mining_assert_service_role();
  if p_user_id is null or p_robot_id is null or p_worksite_id is null
    or nullif(trim(coalesce(p_idempotency_key,'')),'') is null or char_length(p_idempotency_key) > 200 then
    raise exception 'valid user, robot, worksite, and idempotency key are required';
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
  select count(*) into v_settled_cycles from public.mining_sessions
    where user_id = p_user_id and status = 'settled' and ends_at = started_at + interval '24 hours';
  select ranked.position into v_robot_position from (
    select r.id, row_number() over (order by r.created_at, r.id) as position
    from public.robots r where r.owner_user_id = p_user_id
  ) ranked where ranked.id = v_robot.id;
  if v_robot_position > v_settled_cycles + 1 then
    raise exception 'settled mining session required to unlock this robot';
  end if;
  if not exists(select 1 from public.mining_worksites where id = p_worksite_id and status = 'approved') then
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

revoke all on function public.wrs_mining_snapshot_foundation(uuid) from public, anon, authenticated;
revoke all on function public.wrs_mining_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.wrs_start_mining_session(uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.wrs_mining_snapshot_foundation(uuid) to service_role;
grant execute on function public.wrs_mining_snapshot(uuid) to service_role;
grant execute on function public.wrs_start_mining_session(uuid,uuid,uuid,text) to service_role;
