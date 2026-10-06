-- Keep a code usable when no XP award can be credited.
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
  perform public.wrs_mining_assert_service_role();
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
  -- An exception rolls back both the redemption and the code use count.
  if coalesce(v_award->>'status','') <> 'duplicate' and
    (coalesce(v_award->>'status','') <> 'awarded' or coalesce((v_award->>'xp')::integer,0) <= 0) then
    raise exception 'Event XP is unavailable or its daily limit has been reached. Your code has not been used.';
  end if;
  return jsonb_build_object('reward',v_award,'status',
    case when v_award->>'status'='duplicate' then 'already-redeemed' else 'redeemed' end,
    'redemptionId',v_redemption);
end;
$$;
revoke all on function public.wrs_redeem_event_code(uuid,text) from public,anon,authenticated;
grant execute on function public.wrs_redeem_event_code(uuid,text) to service_role;
