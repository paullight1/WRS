-- Versioned XP progression and qualified RBC rewards. No rates are enabled or seeded.
-- Existing point/history records are preserved; new awards use XP and RBC only.
create table public.reward_activity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  source text not null check (source in ('validation','community','mission')),
  reference_id text not null check (char_length(reference_id) between 1 and 200),
  evidence text not null check (char_length(trim(evidence)) between 10 and 2000),
  achievement_code text check (achievement_code ~ '^[a-z][a-z0-9-]{2,79}$'),
  operator_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(user_id,source,reference_id)
);
create table public.activity_reward_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  robot_id uuid not null references public.robots(id) on delete restrict,
  source text not null,
  reference_type text not null,
  reference_id text not null,
  rule_version bigint references public.mining_rule_versions(version) on delete restrict,
  xp integer not null check (xp >= 0),
  mining_power bigint not null check (mining_power >= 0),
  rbc_atomic bigint not null default 0 check (rbc_atomic >= 0),
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(user_id,source,reference_type,reference_id),
  check ((rbc_atomic > 0) = (ledger_transaction_id is not null))
);
create index activity_reward_receipts_user_day_idx on public.activity_reward_receipts(user_id,source,created_at);
create index activity_reward_receipts_issuance_idx on public.activity_reward_receipts(created_at) where rbc_atomic > 0;
alter table public.reward_activity_verifications enable row level security;
alter table public.activity_reward_receipts enable row level security;
revoke all on public.reward_activity_verifications, public.activity_reward_receipts from public,anon,authenticated,service_role;
grant select on public.reward_activity_verifications, public.activity_reward_receipts to service_role;
create trigger reward_activity_verifications_append_only before update or delete on public.reward_activity_verifications
 for each row execute function public.wrs_mining_append_only();
create trigger activity_reward_receipts_append_only before update or delete on public.activity_reward_receipts
 for each row execute function public.wrs_mining_append_only();
alter table public.mining_power_events drop constraint mining_power_events_source_check;
alter table public.mining_power_events add constraint mining_power_events_source_check check
 (source in ('data-task','academy','training','mining-start','daily','profile','verification','validation','community','referral','mission','admin-adjustment','reversal'));

-- Preserve source idempotency across the old reward implementation and the new one.
insert into public.activity_reward_receipts(user_id,robot_id,source,reference_type,reference_id,rule_version,xp,mining_power,created_at)
select history.user_id,history.robot_id,
 case when history.source='data-task' and history.reference_type='data-task-response' and exists(select 1 from public.data_task_responses where id::text=history.reference_id and task_slug like 'training-%') then 'training' else history.source end,
 history.reference_type,history.reference_id,history.rule_version,history.xp,history.power,history.created_at
from (
 select user_id,robot_id,source,reference_type,reference_id,max(rule_version) as rule_version,sum(xp)::integer as xp,sum(power)::bigint as power,min(created_at) as created_at from (
  select x.user_id,x.robot_id,x.metadata->>'verifiedSource' as source,x.reference_type,x.reference_id,
   (select version from public.mining_rule_versions where version::text=x.metadata->>'ruleVersion') as rule_version,
   x.amount as xp,0::bigint as power,x.created_at
   from public.robot_xp_events x where x.amount>0 and x.metadata->>'verifiedSource' in ('data-task','academy','mining-start')
    and not exists(select 1 from public.robot_xp_events reversal where reversal.reversal_of=x.id)
  union all
  select m.user_id,m.robot_id,m.source,m.reference_type,m.reference_id,m.rule_version,0,m.amount,m.created_at
   from public.mining_power_events m where m.amount>0 and m.source in ('data-task','academy','training','mining-start')
    and not exists(select 1 from public.mining_power_events reversal where reversal.reversal_of=m.id)
 ) events group by user_id,robot_id,source,reference_type,reference_id
) history on conflict(user_id,source,reference_type,reference_id) do nothing;

create or replace function public.wrs_miner_level(p_user_id uuid,p_rule jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_xp bigint; v_count bigint; v_level jsonb; v_selected jsonb;
begin
 perform public.wrs_mining_assert_service_role();
 select greatest(0,coalesce(sum(amount),0)) into v_xp from public.robot_xp_events where user_id=p_user_id;
 select count(*) into v_count from public.activity_reward_receipts where user_id=p_user_id
  and source in ('data-task','training','academy','validation','community','mission');
 v_selected := jsonb_build_object('code','new-miner','name','New Miner','level',1,'multiplierBps',10000,'miningPower',0,'totalXp',v_xp);
 for v_level in select value from jsonb_array_elements(coalesce(p_rule,'[]'::jsonb)) order by (value->>'level')::integer loop
  if v_xp < (v_level->>'requiredXp')::bigint or v_count < (v_level->>'requiredVerifiedActivityCount')::bigint then continue; end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(v_level->'requiredAchievementCodes','[]'::jsonb)) code
    where not (code.value='account-verified' and exists(select 1 from public.user_profiles where user_id=p_user_id and email_verified_at is not null))
      and not exists(select 1 from public.reward_activity_verifications a where a.user_id=p_user_id and a.achievement_code=code.value)) then continue; end if;
  v_selected := jsonb_build_object('code',coalesce(v_level->>'code','miner-'||(v_level->>'level')),
   'name',coalesce(v_level->>'name','Miner '||(v_level->>'level')),'level',(v_level->>'level')::integer,
   'multiplierBps',coalesce((v_level->>'multiplierBps')::integer,10000),
   'miningPower',coalesce((v_level->>'miningPower')::bigint,0),'totalXp',v_xp);
 end loop;
 return v_selected;
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
    if coalesce(v_level->>'multiplierBps','10000') !~ '^[0-9]+$'
      or (coalesce(v_level->>'multiplierBps','10000'))::integer not between 10000 and 100000 then
      raise exception 'mining multiplier must be between 1x and 10x';
    end if;
    if (v_level->>'requiredXp')::numeric>9223372036854775807
      or (v_level->>'miningPower')::numeric>9223372036854775807
      or (v_level->>'requiredVerifiedActivityCount')::numeric>2147483647
      or exists(select 1 from jsonb_array_elements(coalesce(v_level->'requiredAchievementCodes','[]'::jsonb)) a
        where jsonb_typeof(a.value)<>'string' or (a.value#>>'{}') !~ '^[a-z][a-z0-9-]{2,79}$') then
      raise exception 'invalid miner achievement requirements';
    end if;
    v_level_number := (v_level->>'level')::integer;
    if v_level_number = any(v_seen_levels) then raise exception 'duplicate miner level'; end if;
    v_seen_levels := array_append(v_seen_levels,v_level_number);
  end loop;
  for v_activity_source,v_activity in select key,value from jsonb_each(coalesce(p_rule->'activityRules','{}'::jsonb)) loop
    if v_activity_source not in ('daily','profile','verification','training','data-task','validation','academy','community','referral','mission','mining-start') or jsonb_typeof(v_activity)<>'object'
      or coalesce(v_activity->>'xp','') !~ '^[0-9]+$'
      or coalesce(v_activity->>'miningPower','') !~ '^[0-9]+$'
      or coalesce(v_activity->>'dailyLimit','') !~ '^[1-9][0-9]*$' then
      raise exception 'invalid activity reward criteria';
    end if;
    if coalesce(v_activity->>'rbcAtomic','0') !~ '^[0-9]+$' or coalesce(v_activity->>'status','active') not in ('active','disabled') then
      raise exception 'invalid activity RBC reward or status';
    end if;
    if (v_activity->>'xp')::numeric>2147483647 or (v_activity->>'dailyLimit')::numeric>2147483647
      or (v_activity->>'miningPower')::numeric>9223372036854775807
      or coalesce((v_activity->>'rbcAtomic')::numeric,0)>9223372036854775807 then
      raise exception 'activity reward exceeds supported limits';
    end if;
    if v_activity_source in ('daily','profile','verification','training','mining-start') and coalesce((v_activity->>'rbcAtomic')::bigint,0) <> 0 then
      raise exception 'routine activities award XP only';
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
  if v_scale is not null and exists(select 1 from public.mining_session_awards union all select 1 from public.activity_reward_receipts where rbc_atomic>0)
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
      or v_rule.minimum_verified_activities<0 then
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
  v_rbc bigint := 0;
  v_receipt uuid;
  v_tx uuid;
  v_economics public.mining_economics_config%rowtype;
  v_issued numeric;
  v_today numeric;
  v_wallet text;
  v_source_id uuid;
begin
  perform public.wrs_mining_assert_service_role();
  -- Serialize awards per account so concurrent approvals cannot exceed daily limits.
  perform 1 from public.user_profiles where user_id=p_user_id and status='active' for update;
  if not found then return jsonb_build_object('status','ineligible'); end if;
  if p_source not in ('daily','profile','verification','training','data-task','validation','academy','community','referral','mission','mining-start') or nullif(trim(coalesce(p_reference_type,'')),'') is null
    or nullif(trim(coalesce(p_reference_id,'')),'') is null then
    return jsonb_build_object('status','ineligible');
  end if;
  select * into v_robot from public.robots where id=p_robot_id and owner_user_id=p_user_id and lifecycle='active';
  if v_robot.id is null then return jsonb_build_object('status','ineligible'); end if;

  if p_source='data-task' and p_reference_type='data-task-response' and exists(
    select 1 from public.data_task_responses where id::text=p_reference_id and task_slug like 'training-%'
  ) then p_source := 'training'; end if;
  if p_source in ('data-task','training') then
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
    if p_source='training' and not exists(select 1 from public.data_task_responses where id::text=p_reference_id and task_slug like 'training-%') then
      return jsonb_build_object('status','ineligible');
    end if;
    v_xp_source := case when p_source='training' then 'training' else 'data' end;
  elsif p_source='academy' then
    if p_reference_type<>'academy-enrollment' or p_reference_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not exists(
        select 1 from public.academy_enrollments e
        where e.id=p_reference_id::uuid and e.user_id=p_user_id and e.status='completed' and e.completed_at is not null
          and exists(select 1 from public.academy_assessments a where a.enrollment_id=e.id and a.status='passed')
      ) then return jsonb_build_object('status','ineligible'); end if;
    v_xp_source := 'academy';
  elsif p_source='mining-start' then
    if p_reference_type<>'mining-session' or p_reference_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not exists(select 1 from public.mining_sessions s where s.id=p_reference_id::uuid and s.user_id=p_user_id
        and s.robot_id=p_robot_id and s.status='active') then
      return jsonb_build_object('status','ineligible');
    end if;
    v_xp_source := 'mining';
  else
    if p_source='daily' then
      if p_reference_type<>'daily-activity' or p_reference_id<>to_char(now() at time zone 'UTC','YYYY-MM-DD') then return jsonb_build_object('status','ineligible'); end if;
    elsif p_source='profile' then
      if p_reference_type<>'member-profile' or p_reference_id<>p_user_id::text or not exists(select 1 from public.user_profiles where user_id=p_user_id and nullif(trim(full_name),'') is not null and nullif(trim(country_code),'') is not null) then return jsonb_build_object('status','ineligible'); end if;
    elsif p_source='verification' then
      if p_reference_type<>'member-verification' or p_reference_id<>p_user_id::text or not exists(select 1 from public.user_profiles where user_id=p_user_id and email_verified_at is not null) then return jsonb_build_object('status','ineligible'); end if;
    elsif p_source='referral' then
      if p_reference_type<>'qualified-referral' or not exists(select 1 from public.referral_relationships where id::text=p_reference_id and referrer_user_id=p_user_id and status='qualified') then return jsonb_build_object('status','ineligible'); end if;
    elsif p_source='community' and p_reference_type='verified-event' then
      if not exists(select 1 from public.event_reward_redemptions where event_id::text=p_reference_id and user_id=p_user_id) and not exists(select 1 from public.community_event_participants where event_id::text=p_reference_id and user_id=p_user_id and status='attended' and nullif(trim(attendance_reference),'') is not null) then return jsonb_build_object('status','ineligible'); end if;
    elsif not exists(select 1 from public.reward_activity_verifications where user_id=p_user_id and source=p_source and id::text=p_reference_id and p_reference_type='verified-activity') then
      return jsonb_build_object('status','ineligible');
    end if;
    v_xp_source := 'reward';
  end if;

  select * into v_rule from public.mining_rule_versions where status='active' order by version desc limit 1;
  if v_rule.id is null or not (v_rule.activity_rules ? p_source) then
    return jsonb_build_object('status','unconfigured');
  end if;
  v_activity_rule := v_rule.activity_rules->p_source;
  if coalesce(v_activity_rule->>'status','active') <> 'active' then return jsonb_build_object('status','disabled'); end if;
  if exists(select 1 from public.activity_reward_receipts where user_id=p_user_id and source=p_source and reference_type=p_reference_type and reference_id=p_reference_id) then
    return jsonb_build_object('status','duplicate');
  end if;
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

  select count(*)::integer into v_daily_count from public.activity_reward_receipts
    where user_id=p_user_id and source=p_source and created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  if v_daily_count>=v_daily_limit then return jsonb_build_object('status','daily-limit'); end if;
  v_rbc := coalesce((v_activity_rule->>'rbcAtomic')::bigint,0);
  if p_source in ('daily','profile','verification','training','mining-start') then v_rbc := 0; end if;
  select * into v_economics from public.mining_economics_config where singleton for update;
  if not coalesce(v_rule.issuance_enabled and v_economics.issuance_enabled,false) then v_rbc := 0; end if;
  if v_rbc>0 then
    if v_rule.atomic_scale is distinct from v_economics.atomic_scale then raise exception 'reward precision mismatch'; end if;
    select coalesce(sum(amount_atomic),0)+(select coalesce(sum(rbc_atomic),0) from public.activity_reward_receipts) into v_issued from public.mining_session_awards;
    select coalesce(sum(amount_atomic),0)+(select coalesce(sum(rbc_atomic),0) from public.activity_reward_receipts where user_id=p_user_id and created_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'))
      into v_today from public.mining_session_awards where user_id=p_user_id and created_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC');
    v_rbc := least(v_rbc,greatest(0,v_economics.global_issuance_cap_atomic-v_issued),greatest(0,v_rule.per_user_daily_cap_atomic-v_today));
    if v_rbc>0 then
      v_wallet := 'liability:wallet:'||p_user_id||':RBC';
      perform public.wrs_ensure_finance_account(null,'equity:rbc-issuance','equity','credit','RBC');
      perform public.wrs_ensure_finance_account(p_user_id,v_wallet,'liability','credit','RBC');
      v_tx := public.wrs_post_ledger_transaction(p_user_id,'rbc-activity-award',v_idempotency,
        'rbc-activity:'||v_idempotency,null,null,jsonb_build_array(
          jsonb_build_object('accountCode','equity:rbc-issuance','direction','debit','amountMinor',v_rbc,'currency','RBC'),
          jsonb_build_object('accountCode',v_wallet,'direction','credit','amountMinor',v_rbc,'currency','RBC')
        ),jsonb_build_object('source',p_source,'ruleVersion',v_rule.version,'atomicScale',v_economics.atomic_scale));
      update public.mining_economics_config set issuance_precision_locked_at=coalesce(issuance_precision_locked_at,now()) where singleton;
    end if;
  end if;

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
  insert into public.activity_reward_receipts(user_id,robot_id,source,reference_type,reference_id,rule_version,xp,mining_power,rbc_atomic,ledger_transaction_id)
    values(p_user_id,p_robot_id,p_source,p_reference_type,p_reference_id,v_rule.version,v_xp,v_power,v_rbc,v_tx) returning id into v_receipt;
  return jsonb_build_object('xp',v_xp,'rbcAtomic',v_rbc::text,'atomicScale',v_economics.atomic_scale,'status','awarded','xpEventId',v_xp_event.id,'miningPowerEventId',v_power_event,'ruleVersion',v_rule.version);
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
  perform 1 from public.user_profiles where user_id=p_user_id for update;
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
    select coalesce(sum(a.amount_atomic),0)+(select coalesce(sum(rbc_atomic),0) from public.activity_reward_receipts where user_id=p_user_id and created_at >= (date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')) into v_already_today from public.mining_session_awards a
      where a.user_id=p_user_id and a.created_at >= (date_trunc('day',now() at time zone 'UTC') at time zone 'UTC');
    v_amount := least(v_amount,greatest(0,v_daily_cap-v_already_today));
  end if;
  select coalesce(sum(a.amount_atomic),0)+(select coalesce(sum(rbc_atomic),0) from public.activity_reward_receipts) into v_already_issued from public.mining_session_awards a;
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

create or replace function public.wrs_mining_snapshot_foundation(p_user_id uuid)
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
  v_progression jsonb;
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
  select count(*)::integer into v_activities from public.activity_reward_receipts where user_id=p_user_id and source in ('data-task','training','academy','validation','community','mission');
  select * into v_session from public.mining_sessions where user_id = p_user_id and status in ('active','ended')
    order by started_at desc limit 1;
  select * into v_rule from public.mining_rule_versions where status = 'active' limit 1;
  v_progression := public.wrs_miner_level(p_user_id,v_rule.level_rules);
  v_level_power := (v_progression->>'miningPower')::bigint;
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
    'level',v_progression,
    'miningPower', greatest(0,v_power),
    'rateBreakdown', case when v_rule.id is null then null else jsonb_build_object(
      'baseRateAtomicPerHour', v_rule.base_rate_atomic_per_hour::text,
      'miningPower', greatest(0,v_power)::text,
      'miningPowerBonusAtomicPerHour', v_rule.mining_power_bonus_atomic_per_hour::text,
      'estimatedAtomicPerHour', (v_rule.base_rate_atomic_per_hour::numeric * (v_progression->>'multiplierBps')::numeric / 10000 + greatest(0,v_power)::numeric * v_rule.mining_power_bonus_atomic_per_hour::numeric)::text,
      'atomicUnitScale', e.atomic_scale
    ) end,
    'recentSessions', v_sessions
  )
  from public.mining_economics_config e where e.singleton;
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
  v_progression jsonb;
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
  select count(*)::integer into v_activities from public.activity_reward_receipts where user_id=p_user_id and source in ('data-task','training','academy','validation','community','mission');
  if v_activities < v_rule.minimum_verified_activities then raise exception 'verified contribution required'; end if;
  v_progression := public.wrs_miner_level(p_user_id,v_rule.level_rules);
  v_level_power := (v_progression->>'miningPower')::bigint;
  v_power := v_power + greatest(0,v_level_power);
  v_rate := floor(v_rule.base_rate_atomic_per_hour::numeric * (v_progression->>'multiplierBps')::numeric / 10000) + v_power::numeric * v_rule.mining_power_bonus_atomic_per_hour;
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
    v_rate::bigint,v_power,v_progression,v_snapshot,
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


create or replace function public.wrs_award_member_milestones(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_robot uuid; v_daily jsonb;
begin
 perform public.wrs_mining_assert_service_role();
 select id into v_robot from public.robots where owner_user_id=p_user_id and lifecycle='active' order by created_at,id limit 1;
 if v_robot is null then return jsonb_build_object('status','robot-required'); end if;
 perform public.wrs_award_verified_mining_activity(p_user_id,v_robot,'profile','member-profile',p_user_id::text);
 perform public.wrs_award_verified_mining_activity(p_user_id,v_robot,'verification','member-verification',p_user_id::text);
 v_daily := public.wrs_award_verified_mining_activity(p_user_id,v_robot,'daily','daily-activity',to_char(now() at time zone 'UTC','YYYY-MM-DD'));
 return v_daily;
end;
$$;
create or replace function public.wrs_admin_verify_reward_activity(p_operator_user_id uuid,p_user_id uuid,p_source text,p_reference_id text,p_evidence text,p_achievement_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_record public.reward_activity_verifications%rowtype; v_robot uuid;
begin
 perform public.wrs_mining_assert_service_role();
 if not public.wrs_operator_has_permission(p_operator_user_id,'operations.rewards') then raise exception 'operator permission denied'; end if;
 select id into v_robot from public.robots where owner_user_id=p_user_id and lifecycle='active' order by created_at,id limit 1;
 if v_robot is null then raise exception 'active robot required'; end if;
 insert into public.reward_activity_verifications(user_id,source,reference_id,evidence,achievement_code,operator_user_id)
 values(p_user_id,p_source,p_reference_id,p_evidence,nullif(trim(p_achievement_code),''),p_operator_user_id)
 on conflict(user_id,source,reference_id) do nothing returning * into v_record;
 if v_record.id is null then raise exception 'activity already verified'; end if;
 perform public.wrs_record_operations_action(p_operator_user_id,'operations.rewards','verified-activity',v_record.id::text,'rewards.activity.verify',p_evidence,jsonb_build_object('source',p_source,'userId',p_user_id));
 return public.wrs_award_verified_mining_activity(p_user_id,v_robot,p_source,'verified-activity',v_record.id::text);
end;
$$;
create or replace function public.wrs_reward_qualified_referral()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_robot uuid;
begin
 if new.status='qualified' and old.status is distinct from 'qualified' then
  select id into v_robot from public.robots where owner_user_id=new.referrer_user_id and lifecycle='active' order by created_at,id limit 1;
  if v_robot is not null then perform public.wrs_award_verified_mining_activity(new.referrer_user_id,v_robot,'referral','qualified-referral',new.id::text); end if;
 end if;
 return new;
end;
$$;
create trigger referral_qualified_xp_rbc after update of status on public.referral_relationships
 for each row execute function public.wrs_reward_qualified_referral();



create or replace function public.wrs_append_reward_point_event(
 p_user_id uuid,p_robot_id uuid,p_amount integer,p_source text,p_reference_type text,p_reference_id text,p_idempotency_key text,p_reversal_of uuid default null,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
begin raise exception 'Reward points are retired. Use the XP and RBC reward rules.'; end;
$$;
create or replace function public.wrs_activate_reward_boost(p_user_id uuid,p_robot_id uuid,p_boost_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin raise exception 'Mining power is earned through XP and verified contributions.'; end;
$$;


create or replace function public.wrs_qualify_referral(p_relationship_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_relation public.referral_relationships%rowtype;
  v_policy public.referral_reward_policies%rowtype;
  v_entitlement public.package_entitlements%rowtype;
  v_referrer_reward uuid;
  v_referred_reward uuid;
begin
  select * into v_relation from public.referral_relationships where id=p_relationship_id for update;
  if v_relation.id is null then raise exception 'referral relationship not found'; end if;
  if v_relation.status='qualified' then return jsonb_build_object('status','qualified','relationshipId',v_relation.id); end if;
  if v_relation.status<>'pending' then raise exception 'referral is not qualifiable'; end if;
  if not exists(
    select 1 from public.user_profiles where user_id=v_relation.referred_user_id and status='active'
      and email_verified_at is not null
  ) then raise exception 'referred account verification incomplete'; end if;
  select * into v_entitlement from public.package_entitlements
    where user_id=v_relation.referred_user_id and status='active' and source='payment' and activated_at<=now()-interval '7 days'
    order by activated_at desc limit 1;
  if v_entitlement.id is null then raise exception 'verified paid activation review window incomplete'; end if;
  update public.referral_relationships set status='qualified',eligible_at=v_entitlement.activated_at+interval '7 days',qualified_at=now(),
    referrer_reward_event_id=v_referrer_reward,referred_reward_event_id=v_referred_reward where id=v_relation.id;
  return jsonb_build_object('status','qualified','relationshipId',v_relation.id,'rewardStatus','configured-xp-rbc');
end;
$$;

alter table public.event_reward_redemptions alter column reward_event_id drop not null;

create or replace function public.wrs_redeem_event_code(p_user_id uuid,p_code_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_code public.event_reward_codes%rowtype;
  v_event public.reward_events%rowtype;
  v_reward uuid;
  v_robot uuid;
  v_award jsonb;
  v_redemption uuid;
begin
  select * into v_code from public.event_reward_codes where code_hash=p_code_hash for update;
  if v_code.id is null or v_code.status<>'active' then raise exception 'event code invalid'; end if;
  if v_code.expires_at<=now() then raise exception 'event code expired'; end if;
  select * into v_event from public.reward_events where id=v_code.event_id;
  if v_event.id is null or v_event.status<>'active' or now()<v_event.starts_at or now()>v_event.ends_at then raise exception 'reward event unavailable'; end if;
  if v_event.require_verified_account and not exists(
    select 1 from public.user_profiles where user_id=p_user_id and status='active' and email_verified_at is not null and phone_verified_at is not null
  ) then raise exception 'verified account required'; end if;
  if exists(select 1 from public.event_reward_redemptions where event_id=v_event.id and user_id=p_user_id) then
    return jsonb_build_object('status','already-redeemed');
  end if;
  if v_code.redemption_count>=v_code.max_redemptions then raise exception 'event code exhausted'; end if;

  select id into v_robot from public.robots where owner_user_id=p_user_id and lifecycle='active' order by created_at,id limit 1;
  if v_robot is null then raise exception 'active robot required'; end if;
  insert into public.event_reward_redemptions(event_id,code_id,user_id,reward_event_id)
  values(v_event.id,v_code.id,p_user_id,v_reward) returning id into v_redemption;
  update public.event_reward_codes set redemption_count=redemption_count+1 where id=v_code.id;
  v_award := public.wrs_award_verified_mining_activity(p_user_id,v_robot,'community','verified-event',v_event.id::text);
  return jsonb_build_object('reward',v_award,'status','redeemed','redemptionId',v_redemption);
end;
$$;


revoke all on function public.wrs_miner_level(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wrs_miner_level(uuid,jsonb) to service_role;

revoke all on function public.wrs_award_verified_mining_activity(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.wrs_award_verified_mining_activity(uuid,uuid,text,text,text) to service_role;

revoke all on function public.wrs_award_member_milestones(uuid) from public,anon,authenticated;
grant execute on function public.wrs_award_member_milestones(uuid) to service_role;

revoke all on function public.wrs_admin_verify_reward_activity(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.wrs_admin_verify_reward_activity(uuid,uuid,text,text,text,text) to service_role;

revoke all on function public.wrs_admin_save_reward_rule(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wrs_admin_save_reward_rule(uuid,text,jsonb) to service_role;

revoke all on function public.wrs_admin_set_mining_issuance(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.wrs_admin_set_mining_issuance(uuid,uuid,boolean,text) to service_role;

revoke all on function public.wrs_mining_snapshot_foundation(uuid) from public,anon,authenticated;
grant execute on function public.wrs_mining_snapshot_foundation(uuid) to service_role;

revoke all on function public.wrs_start_mining_session(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.wrs_start_mining_session(uuid,uuid,uuid,text) to service_role;

revoke all on function public.wrs_settle_due_mining_session(uuid) from public,anon,authenticated;
grant execute on function public.wrs_settle_due_mining_session(uuid) to service_role;


create or replace function public.wrs_member_reward_policy(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_rule public.mining_rule_versions%rowtype;
begin
 perform public.wrs_mining_assert_service_role();
 select * into v_rule from public.mining_rule_versions where status='active' limit 1;
 return jsonb_build_object(
  'activities',coalesce((select jsonb_agg(jsonb_build_object('source',key,'xp',(value->>'xp')::integer,
    'rbcAtomic',coalesce(value->>'rbcAtomic','0'),'dailyLimit',(value->>'dailyLimit')::integer)) from jsonb_each(coalesce(v_rule.activity_rules,'{}'::jsonb))
    where coalesce(value->>'status','active')='active' and key<>'mining-start'),'[]'::jsonb),
  'levels',coalesce(v_rule.level_rules,'[]'::jsonb),
  'recentAwards',coalesce((select jsonb_agg(to_jsonb(a)) from (select source,xp,rbc_atomic::text as "rbcAtomic",created_at as "createdAt" from public.activity_reward_receipts where user_id=p_user_id order by created_at desc limit 20) a),'[]'::jsonb)
 );
end;
$$;
revoke all on function public.wrs_member_reward_policy(uuid) from public,anon,authenticated;
grant execute on function public.wrs_member_reward_policy(uuid) to service_role;


create or replace function public.wrs_assess_academy_enrollment(
  p_enrollment_id uuid,p_score numeric,p_assessor_reference text,p_evidence jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_enrollment public.academy_enrollments%rowtype;
  v_course public.academy_courses%rowtype;
  v_attempt integer;
  v_assessment uuid;
  v_certificate public.academy_certificates%rowtype;
  v_total integer;
  v_complete integer;
  v_passed boolean;
begin
  select * into v_enrollment from public.academy_enrollments where id=p_enrollment_id for update;
  if v_enrollment.id is null or v_enrollment.status not in ('active','completed') then raise exception 'enrollment not assessable'; end if;
  select * into v_course from public.academy_courses where id=v_enrollment.course_id and status='published';
  if v_course.id is null then raise exception 'published course required'; end if;
  select count(*) into v_total from public.academy_modules where course_id=v_course.id and status='published';
  select count(*) into v_complete from public.academy_progress p join public.academy_modules m on m.id=p.module_id
    where p.enrollment_id=v_enrollment.id and m.course_id=v_course.id and m.status='published' and p.progress_percent=100;
  if v_total=0 or v_complete<>v_total then raise exception 'course modules are incomplete'; end if;
  select coalesce(max(attempt),0)+1 into v_attempt from public.academy_assessments where enrollment_id=v_enrollment.id;
  v_passed:=p_score>=v_course.pass_score;
  insert into public.academy_assessments(enrollment_id,attempt,score,status,evidence,assessor_reference)
  values(v_enrollment.id,v_attempt,p_score,case when v_passed then 'passed' else 'failed' end,coalesce(p_evidence,'{}'::jsonb),p_assessor_reference)
  returning id into v_assessment;
  if not v_passed then return jsonb_build_object('status','failed','assessmentId',v_assessment,'score',p_score); end if;

  update public.academy_enrollments set status='completed',completed_at=coalesce(completed_at,now()) where id=v_enrollment.id;
  insert into public.academy_certificates(user_id,course_id,enrollment_id,assessment_id,status)
  values(v_enrollment.user_id,v_course.id,v_enrollment.id,v_assessment,'active')
  on conflict(enrollment_id) do update set status='active',revoked_at=null
  returning * into v_certificate;
  return jsonb_build_object('status','passed','assessmentId',v_assessment,'certificateId',v_certificate.id,'verificationId',v_certificate.public_verification_id);
end;
$$;

create or replace function public.wrs_verify_community_attendance(
  p_event_id uuid,p_user_id uuid,p_attendance_reference text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_participant public.community_event_participants%rowtype; v_robot uuid;
begin
  update public.community_event_participants set status='attended',attended_at=coalesce(attended_at,now()),attendance_reference=p_attendance_reference
  where event_id=p_event_id and user_id=p_user_id and status in ('joined','attended') returning * into v_participant;
  if v_participant.id is null then raise exception 'event participant not found'; end if;
  select id into v_robot from public.robots where owner_user_id=p_user_id and lifecycle='active' order by created_at,id limit 1;
  if v_robot is not null then perform public.wrs_award_verified_mining_activity(p_user_id,v_robot,'community','verified-event',p_event_id::text); end if;
  return jsonb_build_object('participantId',v_participant.id,'status',v_participant.status,'attendedAt',v_participant.attended_at);
end;
$$;

create or replace function public.wrs_mining_precision_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.issuance_precision_locked_at is not null and new.atomic_scale is distinct from old.atomic_scale then
    raise exception 'issuance_precision_locked';
  end if;
  if new.global_issuance_cap_atomic is distinct from old.global_issuance_cap_atomic
    and (exists(select 1 from public.mining_session_awards) or exists(select 1 from public.activity_reward_receipts where rbc_atomic>0)) then
    raise exception 'global issuance cap is locked after first award';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.wrs_reward_qualified_referral() from public,anon,authenticated;

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
      'awardCount',((select count(*) from public.mining_session_awards)+(select count(*) from public.activity_reward_receipts where rbc_atomic>0)),
      'totalIssuedAtomic',(coalesce((select sum(amount_atomic) from public.mining_session_awards),0)+coalesce((select sum(rbc_atomic) from public.activity_reward_receipts),0))::text
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
