-- Plan 12: configured XP/Mining Power progression and replay-safe 24-hour RBC mining.
-- Issuance intentionally starts disabled and precision unset. No example economics
-- are seeded or activated by this migration.

alter table public.robot_xp_events drop constraint if exists robot_xp_events_source_check;
alter table public.robot_xp_events add constraint robot_xp_events_source_check
  check (source in ('training','data','deployment','reward','academy','mining','admin-adjustment'));

create table public.mining_economics_config (
  singleton boolean primary key default true check (singleton),
  atomic_scale integer check (atomic_scale between 0 and 12),
  global_issuance_cap_atomic bigint check (global_issuance_cap_atomic is null or global_issuance_cap_atomic >= 0),
  issuance_enabled boolean not null default false,
  issuance_precision_locked_at timestamptz,
  updated_at timestamptz not null default now(),
  check (issuance_enabled = false or (atomic_scale is not null and global_issuance_cap_atomic > 0))
);
insert into public.mining_economics_config(singleton, atomic_scale, issuance_enabled)
values (true, null, false);

create table public.mining_rule_versions (
  id uuid primary key default gen_random_uuid(),
  version bigint generated always as identity unique,
  status text not null default 'draft' check (status in ('draft','active','disabled')),
  issuance_enabled boolean not null default false,
  atomic_scale integer check (atomic_scale between 0 and 12),
  base_rate_atomic_per_hour bigint not null default 0 check (base_rate_atomic_per_hour >= 0),
  mining_power_bonus_atomic_per_hour bigint not null default 0 check (mining_power_bonus_atomic_per_hour >= 0),
  per_session_cap_atomic bigint check (per_session_cap_atomic is null or per_session_cap_atomic >= 0),
  per_user_daily_cap_atomic bigint check (per_user_daily_cap_atomic is null or per_user_daily_cap_atomic >= 0),
  minimum_verified_activities integer not null default 0 check (minimum_verified_activities >= 0),
  level_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(level_rules) = 'array'),
  activity_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(activity_rules) = 'object'),
  created_by uuid references public.user_profiles(user_id) on delete restrict,
  reason text not null default 'Initial disabled configuration' check (char_length(trim(reason)) between 3 and 1000),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  disabled_at timestamptz,
  check (status <> 'active' or (not issuance_enabled or per_session_cap_atomic is not null and per_user_daily_cap_atomic is not null))
);
create unique index mining_rule_one_active_idx on public.mining_rule_versions(status) where status = 'active';

create table public.mining_power_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  robot_id uuid not null references public.robots(id) on delete restrict,
  amount bigint not null check (amount <> 0),
  source text not null check (source in ('data-task','academy','training','mining-start','admin-adjustment','reversal')),
  reference_type text not null,
  reference_id text not null,
  idempotency_key text not null unique,
  rule_version bigint references public.mining_rule_versions(version) on delete restrict,
  reversal_of uuid unique references public.mining_power_events(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique(user_id, source, reference_type, reference_id)
);
create index mining_power_user_time_idx on public.mining_power_events(user_id, created_at desc, id);
create index mining_power_robot_time_idx on public.mining_power_events(robot_id, created_at desc, id);

create table public.mining_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  robot_id uuid not null references public.robots(id) on delete restrict,
  status text not null default 'active' check (status in ('active','ended','settled','cancelled')),
  idempotency_key text not null,
  rule_id uuid not null references public.mining_rule_versions(id) on delete restrict,
  rule_version bigint not null references public.mining_rule_versions(version) on delete restrict,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  settled_at timestamptz,
  rate_atomic_per_hour bigint not null check (rate_atomic_per_hour >= 0),
  mining_power bigint not null check (mining_power >= 0),
  miner_level jsonb not null default '{}'::jsonb check (jsonb_typeof(miner_level) = 'object'),
  rule_snapshot jsonb not null check (jsonb_typeof(rule_snapshot) = 'object'),
  eligibility_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(eligibility_snapshot) = 'object'),
  earned_atomic bigint check (earned_atomic is null or earned_atomic >= 0),
  created_at timestamptz not null default now(),
  unique(user_id, idempotency_key),
  check (ends_at = started_at + interval '24 hours'),
  check ((status = 'settled') = (settled_at is not null))
);
create index mining_sessions_user_history_idx on public.mining_sessions(user_id, started_at desc, id);
create unique index mining_sessions_one_open_per_robot_idx on public.mining_sessions(robot_id)
  where status in ('active','ended');

create table public.mining_session_awards (
  session_id uuid primary key references public.mining_sessions(id) on delete restrict,
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  amount_atomic bigint not null check (amount_atomic >= 0),
  atomic_scale integer not null check (atomic_scale between 0 and 12),
  ledger_transaction_id uuid not null unique references public.ledger_transactions(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.mining_economics_config enable row level security;
alter table public.mining_rule_versions enable row level security;
alter table public.mining_power_events enable row level security;
alter table public.mining_sessions enable row level security;
alter table public.mining_session_awards enable row level security;
revoke all on public.mining_economics_config, public.mining_rule_versions, public.mining_power_events,
  public.mining_sessions, public.mining_session_awards from public, anon, authenticated, service_role;
grant select on public.mining_economics_config, public.mining_rule_versions, public.mining_power_events,
  public.mining_sessions, public.mining_session_awards to service_role;

create or replace function public.wrs_mining_append_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'mining history is append-only; corrections require compensating events';
end;
$$;
create trigger mining_power_events_append_only before update or delete on public.mining_power_events
  for each row execute function public.wrs_mining_append_only();
create trigger mining_session_awards_append_only before update or delete on public.mining_session_awards
  for each row execute function public.wrs_mining_append_only();

create or replace function public.wrs_mining_rule_immutability_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'mining rule versions cannot be deleted'; end if;
  if new.id is distinct from old.id or new.version is distinct from old.version
    or new.atomic_scale is distinct from old.atomic_scale
    or new.base_rate_atomic_per_hour is distinct from old.base_rate_atomic_per_hour
    or new.mining_power_bonus_atomic_per_hour is distinct from old.mining_power_bonus_atomic_per_hour
    or new.per_session_cap_atomic is distinct from old.per_session_cap_atomic
    or new.per_user_daily_cap_atomic is distinct from old.per_user_daily_cap_atomic
    or new.minimum_verified_activities is distinct from old.minimum_verified_activities
    or new.level_rules is distinct from old.level_rules or new.activity_rules is distinct from old.activity_rules
    or new.created_by is distinct from old.created_by or new.reason is distinct from old.reason
    or new.created_at is distinct from old.created_at then
    raise exception 'mining rule version configuration is immutable';
  end if;
  if new.issuance_enabled is distinct from old.issuance_enabled and not (
    new.status='active' or (old.status='active' and new.status='disabled' and not new.issuance_enabled)
  ) then
    raise exception 'issuance can only change on an active reward rule';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status in ('active','disabled'))
    or (old.status = 'active' and new.status = 'disabled')
    or (old.status = 'disabled' and new.status = 'active')
  ) then raise exception 'invalid mining rule status transition'; end if;
  return new;
end;
$$;
create trigger mining_rule_versions_immutable before update or delete on public.mining_rule_versions
  for each row execute function public.wrs_mining_rule_immutability_guard();

create or replace function public.wrs_mining_session_immutability_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'mining sessions cannot be deleted'; end if;
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.robot_id is distinct from old.robot_id or new.idempotency_key is distinct from old.idempotency_key
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
create trigger mining_sessions_immutable before update or delete on public.mining_sessions
  for each row execute function public.wrs_mining_session_immutability_guard();

create or replace function public.wrs_mining_precision_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.issuance_precision_locked_at is not null and new.atomic_scale is distinct from old.atomic_scale then
    raise exception 'issuance_precision_locked';
  end if;
  if new.global_issuance_cap_atomic is distinct from old.global_issuance_cap_atomic
    and exists(select 1 from public.mining_session_awards) then
    raise exception 'global issuance cap is locked after first award';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger mining_economics_precision_guard before update on public.mining_economics_config
  for each row execute function public.wrs_mining_precision_guard();

create or replace function public.wrs_mining_assert_service_role()
returns void language plpgsql stable set search_path = '' as $$
begin
  if current_user <> 'service_role' and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role required';
  end if;
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
    'rule', (p_session).rule_snapshot,
    'level', (p_session).miner_level,
    'miningPower', (p_session).mining_power,
    'estimatedAwardAtomic', (p_session).earned_atomic::text,
    'awardTransactionId', (select a.ledger_transaction_id from public.mining_session_awards a where a.session_id = (p_session).id)
  )
$$;

create or replace function public.wrs_mining_snapshot(p_user_id uuid)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_robot public.robots%rowtype;
  v_session public.mining_sessions%rowtype;
  v_rule public.mining_rule_versions%rowtype;
  v_power bigint;
  v_level_power bigint;
  v_level integer;
  v_xp bigint;
  v_activities integer;
  v_sessions jsonb;
  v_rbc_balance numeric;
begin
  perform public.wrs_mining_assert_service_role();
  select * into v_robot from public.robots where owner_user_id = p_user_id order by created_at desc limit 1;
  select coalesce(sum(amount),0) into v_power from public.mining_power_events where user_id = p_user_id;
  select coalesce(sum(amount),0) into v_xp from public.robot_xp_events where robot_id = v_robot.id;
  select greatest(0,coalesce(sum(case when le.direction='credit' then le.amount_minor else -le.amount_minor end),0))
    into v_rbc_balance
    from public.ledger_entries le join public.ledger_accounts la on la.id=le.account_id
    where la.owner_user_id=p_user_id and la.currency='RBC'
      and la.code='liability:wallet:'||p_user_id::text||':RBC';
  select count(distinct reference_type || ':' || reference_id)::integer into v_activities
    from public.mining_power_events contribution where user_id = p_user_id and amount > 0
      and source in ('data-task','academy','training') and reversal_of is null
      and not exists(select 1 from public.mining_power_events reversal where reversal.reversal_of=contribution.id);
  select * into v_session from public.mining_sessions where user_id = p_user_id and status in ('active','ended')
    order by started_at desc limit 1;
  select * into v_rule from public.mining_rule_versions where status = 'active' limit 1;
  select greatest(1,coalesce((select (r->>'level')::integer from jsonb_array_elements(v_rule.level_rules) r
    where v_xp >= coalesce((r->>'requiredXp')::bigint,0)
      and v_activities >= coalesce((r->>'requiredVerifiedActivityCount')::integer,0)
      and jsonb_array_length(coalesce(r->'requiredAchievementCodes','[]'::jsonb))=0
    order by (r->>'level')::integer desc limit 1),1)) into v_level;
  select coalesce((select (r->>'miningPower')::bigint from jsonb_array_elements(v_rule.level_rules) r
    where (r->>'level')::integer=v_level),0) into v_level_power;
  v_power := greatest(0,v_power)+greatest(0,v_level_power);
  select coalesce(jsonb_agg(public.wrs_mining_session_json(s) order by s.started_at desc), '[]'::jsonb)
    into v_sessions from (select * from public.mining_sessions where user_id = p_user_id order by started_at desc limit 10) s;
  return jsonb_build_object(
    'authoritative', true,
    'serverNow', now(),
    'rbcBalanceAtomic', coalesce(v_rbc_balance,0)::text,
    'atomicScale', e.atomic_scale,
    'issuanceEnabled', coalesce(v_rule.issuance_enabled and e.issuance_enabled, false),
    'eligibility', jsonb_build_object(
      'eligible', v_robot.id is not null and v_robot.lifecycle = 'active' and v_rule.id is not null
        and v_rule.issuance_enabled and e.issuance_enabled and e.atomic_scale is not null
        and v_activities >= coalesce(v_rule.minimum_verified_activities,0),
      'reasonCodes', case when v_robot.id is null then jsonb_build_array('robot-required')
        when v_robot.lifecycle <> 'active' then jsonb_build_array('robot-inactive')
        when v_rule.id is null or not v_rule.issuance_enabled or not e.issuance_enabled then jsonb_build_array('mining-not-configured')
        when v_activities < v_rule.minimum_verified_activities then jsonb_build_array('verified-contribution-required')
        else '[]'::jsonb end
    ),
    'session', case when v_session.id is null then null else public.wrs_mining_session_json(v_session) end,
    'level', case when v_rule.id is null then null else jsonb_build_object('code','miner-'||v_level,
      'level',v_level,'miningPower',greatest(0,v_level_power)) end,
    'miningPower', greatest(0,v_power),
    'rateBreakdown', case when v_rule.id is null then null else jsonb_build_object(
      'baseRateAtomicPerHour', v_rule.base_rate_atomic_per_hour::text,
      'miningPower', greatest(0,v_power)::text,
      'miningPowerBonusAtomicPerHour', v_rule.mining_power_bonus_atomic_per_hour::text,
      'estimatedAtomicPerHour', (v_rule.base_rate_atomic_per_hour::numeric + greatest(0,v_power)::numeric * v_rule.mining_power_bonus_atomic_per_hour::numeric)::text,
      'atomicUnitScale', e.atomic_scale
    ) end,
    'recentSessions', v_sessions
  )
  from public.mining_economics_config e where e.singleton;
end;
$$;

create or replace function public.wrs_start_mining_session(p_user_id uuid, p_idempotency_key text)
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
begin
  perform public.wrs_mining_assert_service_role();
  if p_user_id is null or nullif(trim(coalesce(p_idempotency_key,'')),'') is null or char_length(p_idempotency_key) > 200 then
    raise exception 'valid user and idempotency key required';
  end if;
  select * into v_existing from public.mining_sessions where user_id=p_user_id and idempotency_key=p_idempotency_key;
  if found then return public.wrs_mining_session_json(v_existing); end if;

  perform 1 from public.user_profiles where user_id=p_user_id for update;
  if not found then raise exception 'account not found'; end if;
  select * into v_robot from public.robots where owner_user_id=p_user_id order by created_at desc limit 1;
  if v_robot.id is null or v_robot.lifecycle <> 'active' then raise exception 'active robot required'; end if;
  select * into v_rule from public.mining_rule_versions where status='active' and issuance_enabled order by version desc limit 1;
  select * into v_economics from public.mining_economics_config where singleton;
  if v_rule.id is null or not v_economics.issuance_enabled or v_economics.atomic_scale is null then
    raise exception 'mining issuance is not configured';
  end if;
  if v_economics.atomic_scale > 12 then raise exception 'unsupported issuance precision'; end if;
  select coalesce(sum(amount),0) into v_power from public.mining_power_events where user_id=p_user_id;
  v_power := greatest(0,v_power);
  select coalesce(sum(amount),0) into v_xp from public.robot_xp_events where robot_id=v_robot.id;
  select count(distinct reference_type || ':' || reference_id)::integer into v_activities from public.mining_power_events
    contribution where user_id=p_user_id and amount>0 and source in ('data-task','academy','training') and reversal_of is null
      and not exists(select 1 from public.mining_power_events reversal where reversal.reversal_of=contribution.id);
  if v_activities < v_rule.minimum_verified_activities then raise exception 'verified contribution required'; end if;
  select greatest(1,coalesce((select (r->>'level')::integer from jsonb_array_elements(v_rule.level_rules) r
    where v_xp>=coalesce((r->>'requiredXp')::bigint,0)
      and v_activities>=coalesce((r->>'requiredVerifiedActivityCount')::integer,0)
      and jsonb_array_length(coalesce(r->'requiredAchievementCodes','[]'::jsonb))=0
    order by (r->>'level')::integer desc limit 1),1)) into v_level;
  select coalesce((select (r->>'miningPower')::bigint from jsonb_array_elements(v_rule.level_rules) r
    where (r->>'level')::integer=v_level),0) into v_level_power;
  v_power := v_power+greatest(0,v_level_power);
  v_rate := v_rule.base_rate_atomic_per_hour + v_power::numeric * v_rule.mining_power_bonus_atomic_per_hour;
  if v_rate > 9223372036854775807 then raise exception 'configured mining rate overflow'; end if;
  v_snapshot := jsonb_build_object(
    'ruleId',v_rule.id,'version',v_rule.version,'issuanceEnabled',v_rule.issuance_enabled,
    'baseRateAtomicPerHour',v_rule.base_rate_atomic_per_hour::text,'miningPowerBonusAtomicPerHour',v_rule.mining_power_bonus_atomic_per_hour::text,
    'rateAtomicPerHour',v_rate::bigint::text,'atomicUnitScale',v_rule.atomic_scale,
    'globalIssuanceCapAtomic',v_economics.global_issuance_cap_atomic::text,
    'perSessionCapAtomic',v_rule.per_session_cap_atomic::text,'perUserDailyCapAtomic',v_rule.per_user_daily_cap_atomic::text
  );
  insert into public.mining_sessions(user_id,robot_id,idempotency_key,rule_id,rule_version,started_at,ends_at,
    rate_atomic_per_hour,mining_power,miner_level,rule_snapshot,eligibility_snapshot)
  values(p_user_id,v_robot.id,p_idempotency_key,v_rule.id,v_rule.version,now(),now()+interval '24 hours',v_rate::bigint,v_power,
    jsonb_build_object('code','miner-'||v_level,'level',v_level),v_snapshot,
    jsonb_build_object('robotLifecycle',v_robot.lifecycle,'verifiedActivityCount',v_activities)) returning * into v_session;
  perform public.wrs_award_verified_mining_activity(
    p_user_id,v_robot.id,'mining-start','mining-session',v_session.id::text
  );
  return public.wrs_mining_session_json(v_session);
exception when unique_violation then
  select * into v_existing from public.mining_sessions where user_id=p_user_id and idempotency_key=p_idempotency_key;
  if found then return public.wrs_mining_session_json(v_existing); end if;
  select * into v_existing from public.mining_sessions where user_id=p_user_id and status in ('active','ended')
    order by started_at desc limit 1;
  if found then return public.wrs_mining_session_json(v_existing); end if;
  raise;
end;
$$;

create or replace function public.wrs_settle_due_mining_session(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session public.mining_sessions%rowtype;
  v_amount numeric;
  v_cap bigint;
  v_daily_cap bigint;
  v_already_today numeric;
  v_user_wallet text;
  v_issuance_account text := 'equity:rbc-issuance';
  v_tx uuid;
  v_scale integer;
  v_economics public.mining_economics_config%rowtype;
  v_already_issued numeric;
begin
  perform public.wrs_mining_assert_service_role();
  select * into v_session from public.mining_sessions where user_id=p_user_id and status in ('active','ended')
    order by started_at desc limit 1 for update;
  if v_session.id is null then return jsonb_build_object('status','none'); end if;
  if now() < v_session.ends_at then return public.wrs_mining_session_json(v_session); end if;
  perform 1 from public.user_profiles where user_id=p_user_id for update;
  update public.mining_sessions set status='ended' where id=v_session.id and status='active';
  select * into v_session from public.mining_sessions where id=v_session.id for update;
  select * into v_economics from public.mining_economics_config where singleton for update;
  if v_economics.global_issuance_cap_atomic is null or v_economics.atomic_scale is null then
    raise exception 'global issuance cap and precision are required';
  end if;
  v_scale := (v_session.rule_snapshot->>'atomicUnitScale')::integer;
  if v_scale is distinct from v_economics.atomic_scale then raise exception 'mining rule precision mismatch'; end if;
  v_amount := floor(least(86400::numeric,greatest(0,extract(epoch from (v_session.ends_at-v_session.started_at))))
    * v_session.rate_atomic_per_hour / 3600);
  v_cap := nullif(v_session.rule_snapshot->>'perSessionCapAtomic','')::bigint;
  if v_cap is not null then v_amount := least(v_amount,v_cap); end if;
  v_daily_cap := nullif(v_session.rule_snapshot->>'perUserDailyCapAtomic','')::bigint;
  if v_daily_cap is not null then
    select coalesce(sum(a.amount_atomic),0) into v_already_today from public.mining_session_awards a
      where a.user_id=p_user_id and a.created_at >= date_trunc('day',now());
    v_amount := least(v_amount,greatest(0,v_daily_cap-v_already_today));
  end if;
  select coalesce(sum(a.amount_atomic),0) into v_already_issued from public.mining_session_awards a;
  v_amount := least(v_amount,greatest(0,v_economics.global_issuance_cap_atomic-v_already_issued));
  if v_amount > 0 then
    v_user_wallet := 'liability:wallet:'||p_user_id||':RBC';
    perform public.wrs_ensure_finance_account(null,v_issuance_account,'equity','credit','RBC');
    perform public.wrs_ensure_finance_account(p_user_id,v_user_wallet,'liability','credit','RBC');
    v_tx := public.wrs_post_ledger_transaction(p_user_id,'rbc-mining-award','rbc-mining:'||v_session.id,
      'rbc-mining-session:'||v_session.id,null,null,jsonb_build_array(
        jsonb_build_object('accountCode',v_issuance_account,'direction','debit','amountMinor',v_amount::bigint,'currency','RBC'),
        jsonb_build_object('accountCode',v_user_wallet,'direction','credit','amountMinor',v_amount::bigint,'currency','RBC')
      ),jsonb_build_object('sessionId',v_session.id,'ruleVersion',v_session.rule_version,'atomicScale',v_scale));
    insert into public.mining_session_awards(session_id,user_id,amount_atomic,atomic_scale,ledger_transaction_id)
      values(v_session.id,p_user_id,v_amount::bigint,v_scale,v_tx);
    update public.mining_economics_config set issuance_precision_locked_at=coalesce(issuance_precision_locked_at,now()) where singleton;
  end if;
  update public.mining_sessions set status='settled',settled_at=now(),earned_atomic=v_amount::bigint where id=v_session.id returning * into v_session;
  return public.wrs_mining_session_json(v_session);
end;
$$;

create or replace function public.wrs_admin_save_reward_rule(p_operator_user_id uuid,p_reason text,p_rule jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_rule public.mining_rule_versions%rowtype;
  v_scale integer;
  v_level jsonb;
  v_activity jsonb;
  v_level_number integer;
  v_activity_source text;
  v_seen_levels integer[] := '{}'::integer[];
  v_global_cap bigint;
  v_economics public.mining_economics_config%rowtype;
  v_has_economics boolean;
begin
  perform public.wrs_mining_assert_service_role();
  if not public.wrs_operator_has_permission(p_operator_user_id,'operations.rewards') then raise exception 'operator permission denied'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'operator reason is required'; end if;
  if jsonb_typeof(p_rule) <> 'object' then raise exception 'rule must be an object'; end if;
  if coalesce((p_rule->>'baseRateAtomicPerHour')::bigint,0)<0
    or coalesce((p_rule->>'miningPowerBonusAtomicPerHour')::bigint,0)<0
    or coalesce((p_rule->>'minimumVerifiedActivities')::integer,0)<0
    or jsonb_typeof(coalesce(p_rule->'levelRules','[]'::jsonb))<>'array'
    or jsonb_typeof(coalesce(p_rule->'activityRules','{}'::jsonb))<>'object' then
    raise exception 'invalid reward rule values';
  end if;
  for v_level in select value from jsonb_array_elements(coalesce(p_rule->'levelRules','[]'::jsonb)) loop
    if jsonb_typeof(v_level)<>'object'
      or coalesce(v_level->>'level','') !~ '^[1-9][0-9]*$'
      or coalesce(v_level->>'requiredXp','') !~ '^[0-9]+$'
      or coalesce(v_level->>'requiredVerifiedActivityCount','') !~ '^[0-9]+$'
      or coalesce(v_level->>'miningPower','') !~ '^[0-9]+$'
      or jsonb_typeof(coalesce(v_level->'requiredAchievementCodes','[]'::jsonb))<>'array' then
      raise exception 'invalid miner level criteria';
    end if;
    v_level_number := (v_level->>'level')::integer;
    if v_level_number = any(v_seen_levels) then raise exception 'duplicate miner level'; end if;
    v_seen_levels := array_append(v_seen_levels,v_level_number);
  end loop;
  for v_activity_source,v_activity in select key,value from jsonb_each(coalesce(p_rule->'activityRules','{}'::jsonb)) loop
    if v_activity_source not in ('data-task','academy','mining-start') or jsonb_typeof(v_activity)<>'object'
      or coalesce(v_activity->>'xp','') !~ '^[0-9]+$'
      or coalesce(v_activity->>'miningPower','') !~ '^[0-9]+$'
      or coalesce(v_activity->>'dailyLimit','') !~ '^[1-9][0-9]*$' then
      raise exception 'invalid activity reward criteria';
    end if;
  end loop;
  v_has_economics := nullif(p_rule->>'atomicScale','') is not null
    and nullif(p_rule->>'baseRateAtomicPerHour','') is not null
    and nullif(p_rule->>'miningPowerBonusAtomicPerHour','') is not null
    and nullif(p_rule->>'perSessionCapAtomic','') is not null
    and nullif(p_rule->>'perUserDailyCapAtomic','') is not null
    and nullif(p_rule->>'globalIssuanceCapAtomic','') is not null
    and nullif(p_rule->>'minimumVerifiedActivities','') is not null;
  v_scale := case when v_has_economics then nullif(p_rule->>'atomicScale','')::integer else null end;
  if v_scale is not null and v_scale not between 0 and 12 then raise exception 'invalid RBC precision'; end if;
  v_global_cap := nullif(p_rule->>'globalIssuanceCapAtomic','')::bigint;
  if v_global_cap is not null and v_global_cap <= 0 then raise exception 'positive global issuance cap is required'; end if;
  select * into v_economics from public.mining_economics_config where singleton for update;
  if v_scale is not null and p_rule ? 'atomicScale' then
    if exists(select 1 from public.mining_rule_versions where status='active')
      and v_scale is distinct from (select atomic_scale from public.mining_economics_config where singleton) then
      raise exception 'cannot change precision while an active reward rule exists';
    end if;
    update public.mining_economics_config set atomic_scale=v_scale where singleton and issuance_precision_locked_at is null;
    if not found and v_scale is distinct from (select atomic_scale from public.mining_economics_config where singleton) then
      raise exception 'issuance_precision_locked';
    end if;
  end if;
  if v_scale is not null and exists(select 1 from public.mining_rule_versions where status='active')
    and v_scale is distinct from v_economics.atomic_scale then raise exception 'cannot change precision while a reward rule is active'; end if;
  if v_scale is not null and exists(select 1 from public.mining_session_awards)
    and v_global_cap is distinct from v_economics.global_issuance_cap_atomic then raise exception 'global issuance cap is locked after first award'; end if;
  if v_scale is not null and exists(select 1 from public.mining_rule_versions where status='active')
    and v_global_cap is distinct from v_economics.global_issuance_cap_atomic then raise exception 'cannot change global issuance cap while a reward rule is active'; end if;
  if v_scale is not null then
    update public.mining_economics_config set atomic_scale=v_scale,global_issuance_cap_atomic=v_global_cap
      where singleton and issuance_precision_locked_at is null;
    if not found and (v_scale is distinct from v_economics.atomic_scale
      or v_global_cap is distinct from v_economics.global_issuance_cap_atomic) then
      raise exception 'issuance precision or global cap is locked';
    end if;
  end if;
  insert into public.mining_rule_versions(status,issuance_enabled,atomic_scale,base_rate_atomic_per_hour,mining_power_bonus_atomic_per_hour,
    per_session_cap_atomic,per_user_daily_cap_atomic,minimum_verified_activities,level_rules,activity_rules,created_by,reason)
  values('draft',false,v_scale,coalesce((p_rule->>'baseRateAtomicPerHour')::bigint,0),
    coalesce((p_rule->>'miningPowerBonusAtomicPerHour')::bigint,0),nullif(p_rule->>'perSessionCapAtomic','')::bigint,
    nullif(p_rule->>'perUserDailyCapAtomic','')::bigint,coalesce((p_rule->>'minimumVerifiedActivities')::integer,0),
    coalesce(p_rule->'levelRules','[]'::jsonb),coalesce(p_rule->'activityRules','{}'::jsonb),p_operator_user_id,trim(p_reason))
  returning * into v_rule;
  perform public.wrs_record_operations_action(p_operator_user_id,'operations.rewards','mining_rule',v_rule.id::text,
    'rewards.rule.save',p_reason,jsonb_build_object('version',v_rule.version,'status',v_rule.status));
  return jsonb_build_object('ruleId',v_rule.id,'version',v_rule.version,'status',v_rule.status,'issuanceEnabled',v_rule.issuance_enabled);
end;
$$;

create or replace function public.wrs_admin_set_reward_rule_status(p_operator_user_id uuid,p_rule_id uuid,p_status text,p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_rule public.mining_rule_versions%rowtype;
begin
  perform public.wrs_mining_assert_service_role();
  if not public.wrs_operator_has_permission(p_operator_user_id,'operations.rewards') then raise exception 'operator permission denied'; end if;
  if p_status not in ('active','disabled') or nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'status and reason are required'; end if;
  select * into v_rule from public.mining_rule_versions where id=p_rule_id for update;
  if not found then raise exception 'reward rule not found'; end if;
  if p_status='active' then
    if v_rule.activity_rules='{}'::jsonb or jsonb_array_length(v_rule.level_rules)=0 then
      raise exception 'progression activity and level rules are required';
    end if;
    update public.mining_rule_versions set status='disabled',issuance_enabled=false,disabled_at=now() where status='active';
    update public.mining_economics_config set issuance_enabled=false where singleton;
    update public.mining_rule_versions set status='active',issuance_enabled=false,activated_at=now() where id=p_rule_id returning * into v_rule;
  else
    update public.mining_rule_versions set status='disabled',issuance_enabled=false,disabled_at=now() where id=p_rule_id returning * into v_rule;
    if not exists(select 1 from public.mining_rule_versions where status='active' and issuance_enabled) then
      update public.mining_economics_config set issuance_enabled=false where singleton;
    end if;
  end if;
  perform public.wrs_record_operations_action(p_operator_user_id,'operations.rewards','mining_rule',p_rule_id::text,
    case when p_status='active' then 'rewards.rule.activate' else 'rewards.rule.disable' end,p_reason,
    jsonb_build_object('version',v_rule.version,'status',v_rule.status));
  return jsonb_build_object('ruleId',v_rule.id,'version',v_rule.version,'status',v_rule.status,'issuanceEnabled',v_rule.issuance_enabled);
end;
$$;

create or replace function public.wrs_admin_set_mining_issuance(p_operator_user_id uuid,p_rule_id uuid,p_enabled boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_rule public.mining_rule_versions%rowtype; v_economics public.mining_economics_config%rowtype;
begin
  perform public.wrs_mining_assert_service_role();
  if not public.wrs_operator_has_permission(p_operator_user_id,'operations.rewards') then raise exception 'operator permission denied'; end if;
  if p_enabled is null or nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'issuance state and reason are required'; end if;
  select * into v_rule from public.mining_rule_versions where id=p_rule_id and status='active' for update;
  if not found then raise exception 'an active progression rule is required'; end if;
  select * into v_economics from public.mining_economics_config where singleton for update;
  if p_enabled then
    if v_rule.atomic_scale is null or v_economics.atomic_scale is distinct from v_rule.atomic_scale
      or v_economics.global_issuance_cap_atomic is null or v_economics.global_issuance_cap_atomic<=0
      or v_rule.base_rate_atomic_per_hour<=0 or v_rule.per_session_cap_atomic is null or v_rule.per_session_cap_atomic<=0
      or v_rule.per_user_daily_cap_atomic is null or v_rule.per_user_daily_cap_atomic<=0
      or v_rule.minimum_verified_activities<=0 then
      raise exception 'complete, positive RBC issuance economics are required';
    end if;
    update public.mining_rule_versions set issuance_enabled=true where id=p_rule_id returning * into v_rule;
    update public.mining_economics_config set issuance_enabled=true where singleton;
  else
    update public.mining_rule_versions set issuance_enabled=false where id=p_rule_id returning * into v_rule;
    update public.mining_economics_config set issuance_enabled=false where singleton;
  end if;
  perform public.wrs_record_operations_action(p_operator_user_id,'operations.rewards','mining_rule',p_rule_id::text,
    case when p_enabled then 'rewards.issuance.enable' else 'rewards.issuance.disable' end,p_reason,
    jsonb_build_object('version',v_rule.version,'enabled',p_enabled));
  return jsonb_build_object('ruleId',v_rule.id,'version',v_rule.version,'status',v_rule.status,'issuanceEnabled',v_rule.issuance_enabled);
end;
$$;

create or replace function public.wrs_award_verified_mining_activity(
  p_user_id uuid,p_robot_id uuid,p_source text,p_reference_type text,p_reference_id text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_robot public.robots%rowtype;
  v_rule public.mining_rule_versions%rowtype;
  v_activity_rule jsonb;
  v_xp integer;
  v_power bigint;
  v_daily_limit integer;
  v_daily_count integer;
  v_xp_source text;
  v_idempotency text;
  v_xp_event public.robot_xp_events%rowtype;
  v_power_event uuid;
begin
  -- Serialize awards per account so concurrent approvals cannot exceed daily limits.
  perform 1 from public.user_profiles where user_id=p_user_id for update;
  if not found then return jsonb_build_object('status','ineligible'); end if;
  if p_source not in ('data-task','academy','mining-start') or nullif(trim(coalesce(p_reference_type,'')),'') is null
    or nullif(trim(coalesce(p_reference_id,'')),'') is null then
    return jsonb_build_object('status','ineligible');
  end if;
  select * into v_robot from public.robots where id=p_robot_id and owner_user_id=p_user_id and lifecycle='active';
  if v_robot.id is null then return jsonb_build_object('status','ineligible'); end if;

  if p_source='data-task' then
    if p_reference_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or (p_reference_type='data-submission' and not exists(
        select 1 from public.data_submissions s join public.data_assets a on a.id=s.asset_id
        where s.id=p_reference_id::uuid and s.user_id=p_user_id and s.status='approved'
          and a.user_id=p_user_id and a.status='approved' and a.scan_status='clean'
          and public.wrs_has_active_consent(p_user_id,a.purpose_slug,a.data_category)
      ))
      or (p_reference_type='data-task-response' and not exists(
        select 1 from public.data_task_responses response
        where response.id=p_reference_id::uuid and response.user_id=p_user_id and response.status='approved'
          and public.wrs_has_active_consent(p_user_id,'dataset-contribution',response.data_category)
      ))
      or p_reference_type not in ('data-submission','data-task-response') then
      return jsonb_build_object('status','ineligible');
    end if;
    v_xp_source := 'data';
  elsif p_source='academy' then
    if p_reference_type<>'academy-enrollment' or p_reference_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not exists(
        select 1 from public.academy_enrollments e
        where e.id=p_reference_id::uuid and e.user_id=p_user_id and e.status='completed' and e.completed_at is not null
          and exists(select 1 from public.academy_assessments a where a.enrollment_id=e.id and a.status='passed')
      ) then return jsonb_build_object('status','ineligible'); end if;
    v_xp_source := 'academy';
  else
    if p_reference_type<>'mining-session' or p_reference_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not exists(select 1 from public.mining_sessions s where s.id=p_reference_id::uuid and s.user_id=p_user_id
        and s.robot_id=p_robot_id and s.status='active') then
      return jsonb_build_object('status','ineligible');
    end if;
    v_xp_source := 'mining';
  end if;

  select * into v_rule from public.mining_rule_versions where status='active' order by version desc limit 1;
  if v_rule.id is null or not (v_rule.activity_rules ? p_source) then
    return jsonb_build_object('status','unconfigured');
  end if;
  v_activity_rule := v_rule.activity_rules->p_source;
  if jsonb_typeof(v_activity_rule)<>'object'
    or coalesce(v_activity_rule->>'xp','') !~ '^[0-9]+$'
    or coalesce(v_activity_rule->>'miningPower','') !~ '^[0-9]+$'
    or coalesce(v_activity_rule->>'dailyLimit','') !~ '^[1-9][0-9]*$' then
    return jsonb_build_object('status','unconfigured');
  end if;
  v_xp := (v_activity_rule->>'xp')::integer;
  v_power := (v_activity_rule->>'miningPower')::bigint;
  v_daily_limit := (v_activity_rule->>'dailyLimit')::integer;
  v_idempotency := 'progression:'||p_source||':'||p_user_id||':'||p_reference_type||':'||p_reference_id;

  select * into v_xp_event from public.robot_xp_events where user_id=p_user_id and robot_id=p_robot_id
    and source=v_xp_source and reference_type=p_reference_type and reference_id=p_reference_id and reversal_of is null;
  select id into v_power_event from public.mining_power_events where user_id=p_user_id and robot_id=p_robot_id
    and source=p_source and reference_type=p_reference_type and reference_id=p_reference_id and reversal_of is null;
  if v_xp_event.id is not null or v_power_event is not null then
    return jsonb_build_object('status','duplicate','xpEventId',v_xp_event.id,'miningPowerEventId',v_power_event);
  end if;

  select count(*)::integer into v_daily_count from (
    select reference_type,reference_id from public.mining_power_events
      where user_id=p_user_id and source=p_source and amount>0 and reversal_of is null and created_at>=date_trunc('day',now())
    union
    select reference_type,reference_id from public.robot_xp_events
      where user_id=p_user_id and source=v_xp_source and amount>0 and reversal_of is null and created_at>=date_trunc('day',now())
  ) counted_activity;
  if v_daily_count>=v_daily_limit then return jsonb_build_object('status','daily-limit'); end if;
  if v_xp=0 and v_power=0 then return jsonb_build_object('status','no-award'); end if;

  if v_xp>0 then
    select * into v_xp_event from public.wrs_append_robot_xp_event(p_user_id,jsonb_build_object(
      'id',gen_random_uuid(),'robotId',p_robot_id,'source',v_xp_source,'amount',v_xp,
      'referenceType',p_reference_type,'referenceId',p_reference_id,'idempotencyKey',v_idempotency,
      'reversalOf',null,'metadata',jsonb_build_object('ruleVersion',v_rule.version,'verifiedSource',p_source)
    ));
  end if;
  if v_power>0 then
    insert into public.mining_power_events(user_id,robot_id,amount,source,reference_type,reference_id,idempotency_key,rule_version,metadata)
    values(p_user_id,p_robot_id,v_power,p_source,p_reference_type,p_reference_id,'mining-power:'||v_idempotency,v_rule.version,
      jsonb_build_object('verified',true,'ruleVersion',v_rule.version)) returning id into v_power_event;
  end if;
  return jsonb_build_object('status','awarded','xpEventId',v_xp_event.id,'miningPowerEventId',v_power_event,'ruleVersion',v_rule.version);
end;
$$;

create or replace function public.wrs_award_approved_data_asset_progression()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_submission public.data_submissions%rowtype; v_robot public.robots%rowtype;
begin
  if new.status<>'approved' or new.scan_status<>'clean' then return new; end if;
  select * into v_submission from public.data_submissions where asset_id=new.id and user_id=new.user_id and status='approved';
  if v_submission.id is null or not public.wrs_has_active_consent(new.user_id,new.purpose_slug,new.data_category) then return new; end if;
  select * into v_robot from public.robots where owner_user_id=new.user_id and lifecycle='active' order by created_at limit 1;
  if v_robot.id is not null then
    perform public.wrs_award_verified_mining_activity(new.user_id,v_robot.id,'data-task','data-submission',v_submission.id::text);
  end if;
  return new;
end;
$$;
create trigger data_assets_approved_progression after update of status,scan_status on public.data_assets
  for each row execute function public.wrs_award_approved_data_asset_progression();

create or replace function public.wrs_award_completed_academy_progression()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_robot public.robots%rowtype;
begin
  if new.status<>'completed' or new.completed_at is null or old.status='completed'
    or not exists(select 1 from public.academy_assessments a where a.enrollment_id=new.id and a.status='passed') then return new; end if;
  select * into v_robot from public.robots where owner_user_id=new.user_id and lifecycle='active' order by created_at limit 1;
  if v_robot.id is not null then
    perform public.wrs_award_verified_mining_activity(new.user_id,v_robot.id,'academy','academy-enrollment',new.id::text);
  end if;
  return new;
end;
$$;
create trigger academy_enrollment_completed_progression after update of status on public.academy_enrollments
  for each row execute function public.wrs_award_completed_academy_progression();

create or replace function public.wrs_review_data_task_response(
  p_operator_user_id uuid,p_response_id uuid,p_status text,p_quality_score numeric,p_reason text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_response public.data_task_responses%rowtype; v_xp_awarded boolean:=false; v_mp_awarded boolean:=false;
begin
  perform public.wrs_mining_assert_service_role();
  if not public.wrs_operator_has_permission(p_operator_user_id,'operations.data') then raise exception 'operator permission denied'; end if;
  if p_status not in ('approved','rejected') or p_quality_score is null or p_quality_score not between 0 and 100
    or nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'valid decision, quality score and review reason required'; end if;
  if p_status='approved' and p_quality_score<80 then raise exception 'approved task responses require a quality score of at least 80'; end if;
  select * into v_response from public.data_task_responses where id=p_response_id for update;
  if not found then raise exception 'data task response not found'; end if;
  if v_response.status not in ('submitted','review') then raise exception 'data task response is not awaiting review'; end if;
  if p_status='approved' and not public.wrs_has_active_consent(v_response.user_id,'dataset-contribution',v_response.data_category) then
    raise exception 'active dataset contribution consent is required';
  end if;
  update public.data_task_responses set status=p_status,quality_score=p_quality_score,reviewed_at=now() where id=p_response_id;
  if p_status='approved' then
    select exists(select 1 from public.robot_xp_events where user_id=v_response.user_id and source='data'
        and reference_type='data-task-response' and reference_id=p_response_id::text and amount>0 and reversal_of is null),
      exists(select 1 from public.mining_power_events where user_id=v_response.user_id and source='data-task'
        and reference_type='data-task-response' and reference_id=p_response_id::text and amount>0 and reversal_of is null)
      into v_xp_awarded,v_mp_awarded;
  end if;
  perform public.wrs_record_operations_action(p_operator_user_id,'operations.data','data_task_response',p_response_id::text,
    'data.task.review',p_reason,jsonb_build_object('status',p_status,'qualityScore',p_quality_score,'taskSlug',v_response.task_slug));
  return jsonb_build_object('id',p_response_id,'status',p_status,'qualityScore',p_quality_score,
    'progressionAwarded',v_xp_awarded or v_mp_awarded,'xpAwarded',v_xp_awarded,'miningPowerAwarded',v_mp_awarded);
end;
$$;

create or replace function public.wrs_award_approved_data_task_progression()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_robot public.robots%rowtype;
begin
  if new.status<>'approved' or old.status='approved'
    or not public.wrs_has_active_consent(new.user_id,'dataset-contribution',new.data_category) then return new; end if;
  select * into v_robot from public.robots where owner_user_id=new.user_id and lifecycle='active' order by created_at limit 1;
  if v_robot.id is not null then
    perform public.wrs_award_verified_mining_activity(new.user_id,v_robot.id,'data-task','data-task-response',new.id::text);
  end if;
  return new;
end;
$$;
create trigger data_task_response_approved_progression after update of status on public.data_task_responses
  for each row execute function public.wrs_award_approved_data_task_progression();

insert into public.roles(slug,description) values
  ('reward_operator','Configure and review XP and Mining Power reward rules')
on conflict(slug) do update set description=excluded.description;
insert into public.permissions(slug,description) values
  ('operations.rewards','Review and configure versioned mining reward rules')
on conflict(slug) do update set description=excluded.description;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.slug='reward_operator' and p.slug in ('operations.read','operations.rewards')
on conflict do nothing;

create or replace function public.wrs_mining_operations_snapshot(p_operator_user_id uuid)
returns jsonb language plpgsql security definer stable set search_path = '' as $$
declare v_result jsonb;
begin
  perform public.wrs_mining_assert_service_role();
  if not public.wrs_operator_has_permission(p_operator_user_id,'operations.rewards') then
    raise exception 'operator permission denied';
  end if;
  select jsonb_build_object(
    'issuance',jsonb_build_object(
      'enabled',e.issuance_enabled,
      'atomicScale',e.atomic_scale,
      'globalIssuanceCapAtomic',e.global_issuance_cap_atomic::text,
      'awardCount',coalesce((select count(*) from public.mining_session_awards),0),
      'totalIssuedAtomic',coalesce((select sum(amount_atomic) from public.mining_session_awards),0)::text
    ),
    'rules',coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'version',r.version,'status',r.status,'issuanceEnabled',r.issuance_enabled,
      'atomicScale',r.atomic_scale,
      'baseRateAtomicPerHour',r.base_rate_atomic_per_hour,'miningPowerBonusAtomicPerHour',r.mining_power_bonus_atomic_per_hour,
      'perSessionCapAtomic',r.per_session_cap_atomic,'perUserDailyCapAtomic',r.per_user_daily_cap_atomic,
      'minimumVerifiedActivities',r.minimum_verified_activities,'levelRules',r.level_rules,'activityRules',r.activity_rules,
      'createdAt',r.created_at,'activatedAt',r.activated_at,'disabledAt',r.disabled_at
    ) order by r.version desc) from (select * from public.mining_rule_versions order by version desc limit 30) r),'[]'::jsonb)
  ) into v_result from public.mining_economics_config e where e.singleton;
  return coalesce(v_result,'{}'::jsonb);
end;
$$;

revoke all on function public.wrs_mining_assert_service_role() from public, anon, authenticated;
revoke all on function public.wrs_mining_session_json(public.mining_sessions) from public, anon, authenticated;
revoke all on function public.wrs_mining_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.wrs_start_mining_session(uuid,text) from public, anon, authenticated;
revoke all on function public.wrs_settle_due_mining_session(uuid) from public, anon, authenticated;
revoke all on function public.wrs_admin_save_reward_rule(uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.wrs_admin_set_reward_rule_status(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.wrs_admin_set_mining_issuance(uuid,uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.wrs_mining_operations_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.wrs_award_verified_mining_activity(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.wrs_review_data_task_response(uuid,uuid,text,numeric,text) from public, anon, authenticated;
grant execute on function public.wrs_mining_session_json(public.mining_sessions) to service_role;
grant execute on function public.wrs_mining_snapshot(uuid) to service_role;
grant execute on function public.wrs_start_mining_session(uuid,text) to service_role;
grant execute on function public.wrs_settle_due_mining_session(uuid) to service_role;
grant execute on function public.wrs_admin_save_reward_rule(uuid,text,jsonb) to service_role;
grant execute on function public.wrs_admin_set_reward_rule_status(uuid,uuid,text,text) to service_role;
grant execute on function public.wrs_admin_set_mining_issuance(uuid,uuid,boolean,text) to service_role;
grant execute on function public.wrs_mining_operations_snapshot(uuid) to service_role;
grant execute on function public.wrs_mining_assert_service_role() to service_role;
grant execute on function public.wrs_award_verified_mining_activity(uuid,uuid,text,text,text) to service_role;
grant execute on function public.wrs_review_data_task_response(uuid,uuid,text,numeric,text) to service_role;
revoke all on function public.wrs_mining_append_only() from public, anon, authenticated;
revoke all on function public.wrs_mining_precision_guard() from public, anon, authenticated;
revoke all on function public.wrs_mining_rule_immutability_guard() from public, anon, authenticated;
revoke all on function public.wrs_mining_session_immutability_guard() from public, anon, authenticated;
revoke all on function public.wrs_award_approved_data_asset_progression() from public, anon, authenticated;
revoke all on function public.wrs_award_completed_academy_progression() from public, anon, authenticated;
revoke all on function public.wrs_award_approved_data_task_progression() from public, anon, authenticated;
