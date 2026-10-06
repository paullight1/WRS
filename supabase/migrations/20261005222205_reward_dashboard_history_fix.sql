-- Read-only member reward totals and history. Never awards XP or RoboCoin.
create or replace function public.wrs_member_reward_dashboard(p_user_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_xp jsonb; v_referrals jsonb; v_history jsonb;
begin
  perform public.wrs_mining_assert_service_role();
  with events as (
    select e.amount, coalesce(e.metadata->>'verifiedSource', original.metadata->>'verifiedSource', e.source) as source
    from public.robot_xp_events e
    left join public.robot_xp_events original on original.id=e.reversal_of and original.user_id=e.user_id
    where e.user_id=p_user_id
  )
  select jsonb_build_object(
    'activityXp',greatest(0,coalesce(sum(amount) filter(where source<>'referral'),0)),
    'referralXp',greatest(0,coalesce(sum(amount) filter(where source='referral'),0)),
    'totalXp',greatest(0,coalesce(sum(amount),0))
  ) into v_xp from events;
  select jsonb_build_object(
    'total',count(*), 'pending',count(*) filter(where status='pending'),
    'qualified',count(*) filter(where status='qualified')
  ) into v_referrals from public.referral_relationships where referrer_user_id=p_user_id;
  with history as (
    select e.id::text as id,
      coalesce(e.metadata->>'verifiedSource',original.metadata->>'verifiedSource',e.source) as source,
      e.amount::text as amount, 'XP'::text as currency, 0 as scale, e.created_at
    from public.robot_xp_events e
    left join public.robot_xp_events original on original.id=e.reversal_of and original.user_id=e.user_id
    where e.user_id=p_user_id
    union all
    select a.session_id::text, 'mining', a.amount_atomic::text, 'RBC', a.atomic_scale, a.created_at
    from public.mining_session_awards a
    join public.mining_sessions s on s.id=a.session_id and s.status='settled'
    join public.ledger_transactions tx on tx.id=a.ledger_transaction_id and tx.status='posted'
    where a.user_id=p_user_id and not exists (
      select 1 from public.ledger_transactions r where r.status='posted' and r.kind='rbc-mining-award-reversal'
        and r.metadata->>'reversesTransactionId'=tx.id::text
    )
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'source',source,'amount',amount,
    'currency',currency,'atomicScale',scale,'createdAt',created_at) order by created_at desc,id),'[]'::jsonb)
  into v_history from (select * from history order by created_at desc,id limit 20) recent;
  return v_xp || jsonb_build_object('referrals',v_referrals,'history',v_history);
end;
$$;
revoke all on function public.wrs_member_reward_dashboard(uuid) from public,anon,authenticated;
grant execute on function public.wrs_member_reward_dashboard(uuid) to service_role;

create index if not exists robot_xp_events_user_history_idx on public.robot_xp_events(user_id,created_at desc,id);
