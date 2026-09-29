-- Plan 12: database-side member metrics and privacy-preserving RBC leaderboard.

create or replace function public.wrs_mining_summary(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_active integer;
  v_mining_ms numeric;
  v_weighted_rate numeric;
  v_average text;
  v_scale integer;
  v_balance numeric;
begin
  perform public.wrs_mining_assert_service_role();
  with durations as (
    select s.status, s.rate_atomic_per_hour::numeric as rate,
      case when s.status = 'active'
        then floor(greatest(0,extract(epoch from (least(s.ends_at,now())-s.started_at))*1000))::numeric
        when s.status in ('ended','settled')
        then floor(greatest(0,extract(epoch from (s.ends_at-s.started_at))*1000))::numeric
        else 0::numeric end as duration_ms
    from public.mining_sessions s where s.user_id = p_user_id and s.status <> 'cancelled'
  )
  select coalesce(sum(duration_ms),0), coalesce(sum(rate*duration_ms),0),
    case when coalesce(sum(duration_ms),0) > 0
      then round(sum(rate*duration_ms)/sum(duration_ms),6)::text else null end,
    case when exists(select 1 from durations d where d.status='active' and d.duration_ms>0) then 1 else 0 end
  into v_mining_ms,v_weighted_rate,v_average,v_active from durations;
  select atomic_scale into v_scale from public.mining_economics_config where singleton;
  select greatest(0,coalesce(sum(case when le.direction='credit' then le.amount_minor else -le.amount_minor end),0))
    into v_balance
    from public.ledger_entries le
    join public.ledger_accounts la on la.id=le.account_id
    join public.ledger_transactions tx on tx.id=le.transaction_id and tx.status='posted'
    where la.owner_user_id=p_user_id and la.currency='RBC'
      and la.code='liability:wallet:'||p_user_id::text||':RBC';
  return jsonb_build_object('stats',jsonb_build_object(
    'activeRobots',v_active::smallint,
    'miningMilliseconds',v_mining_ms::text,
    'averageRateAtomicPerHour',v_average,
    'atomicScale',v_scale
  ),'availableAtomic',coalesce(v_balance,0)::text);
end;
$$;

create or replace function public.wrs_mining_leaderboard(p_period text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_rows jsonb;
begin
  perform public.wrs_mining_assert_service_role();
  if p_period is null or p_period not in ('week','all-time') then raise exception 'unsupported leaderboard period'; end if;
  with totals as (
    select a.user_id,p.display_alias as member_handle,a.atomic_scale,
      sum(a.amount_atomic)::numeric as earned_atomic
    from public.mining_session_awards a
    join public.mining_sessions s on s.id=a.session_id and s.status='settled'
    join public.ledger_transactions tx on tx.id=a.ledger_transaction_id and tx.status='posted'
    join public.community_leaderboard_profiles p on p.user_id=a.user_id and p.opted_in
    where (p_period='all-time' or a.created_at >= now()-interval '7 days')
      and not exists (
        select 1 from public.ledger_transactions reversal
        where reversal.status='posted' and reversal.kind='rbc-mining-award-reversal'
          and reversal.metadata->>'reversesTransactionId'=tx.id::text
      )
    group by a.user_id,p.display_alias,a.atomic_scale
  ), ranked as (
    select row_number() over(order by earned_atomic desc,member_handle asc,user_id asc)::integer as rank,
      member_handle,earned_atomic::text as earned_atomic,atomic_scale
    from totals
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank',rank,'memberHandle',member_handle,'earnedAtomic',earned_atomic,'atomicScale',atomic_scale
  ) order by rank),'[]'::jsonb) into v_rows from ranked;
  return jsonb_build_object('period',p_period,'rows',v_rows);
end;
$$;

revoke all on function public.wrs_mining_summary(uuid) from public, anon, authenticated;
revoke all on function public.wrs_mining_leaderboard(text) from public, anon, authenticated;
grant execute on function public.wrs_mining_summary(uuid) to service_role;
grant execute on function public.wrs_mining_leaderboard(text) to service_role;
