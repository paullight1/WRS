\set ON_ERROR_STOP on

insert into auth.users(id,email,phone) values
  ('00000000-0000-4000-8000-000000000801','ecosystem-owner@example.com','+2348012345801'),
  ('00000000-0000-4000-8000-000000000802','ecosystem-referred@example.com','+2348012345802'),
  ('00000000-0000-4000-8000-000000000803','ecosystem-third@example.com','+2348012345803')
on conflict(id) do nothing;

insert into public.user_profiles(
  user_id,full_name,normalized_email,normalized_phone,status,terms_version,privacy_version,
  email_verified_at,phone_verified_at,kyc_status
) values
  ('00000000-0000-4000-8000-000000000801','Ecosystem Owner','ecosystem-owner@example.com','+2348012345801','active','2026-01','2026-01',now(),now(),'verified'),
  ('00000000-0000-4000-8000-000000000802','Ecosystem Referred','ecosystem-referred@example.com','+2348012345802','active','2026-01','2026-01',now(),now(),'verified'),
  ('00000000-0000-4000-8000-000000000803','Ecosystem Third','ecosystem-third@example.com','+2348012345803','active','2026-01','2026-01',now(),now(),'verified')
on conflict(user_id) do nothing;

insert into public.robots(id,owner_user_id,name,lifecycle,package_slug,requested_package_slug)
values
  ('00000000-0000-4000-8000-000000000811','00000000-0000-4000-8000-000000000801','Eco-801','active','professional','professional'),
  ('00000000-0000-4000-8000-000000000812','00000000-0000-4000-8000-000000000802','Eco-802','active','builder','builder')
on conflict(id) do nothing;

insert into public.marketplace_publishers(id,slug,name,status)
values('00000000-0000-4000-8000-000000000820','wrs-labs','WRS Labs','active')
on conflict(id) do nothing;

insert into public.marketplace_items(id,publisher_id,slug,name,description,item_type,min_package_slug,status) values
  ('00000000-0000-4000-8000-000000000821','00000000-0000-4000-8000-000000000820','eco-free-skill','Free Ecosystem Skill','Free verified skill','skill','starter','published'),
  ('00000000-0000-4000-8000-000000000822','00000000-0000-4000-8000-000000000820','eco-paid-skill','Paid Ecosystem Skill','Wallet-funded verified skill','skill','professional','published'),
  ('00000000-0000-4000-8000-000000000823','00000000-0000-4000-8000-000000000820','eco-enterprise-skill','Enterprise Ecosystem Skill','Tier-restricted verified skill','skill','enterprise','published')
on conflict(id) do nothing;

insert into public.marketplace_versions(
  id,item_id,version,price_minor,currency,skill_slug,verification_status,manifest,published_at
) values
  ('00000000-0000-4000-8000-000000000831','00000000-0000-4000-8000-000000000821','1.0.0',0,'USD','ecosystem.free','approved','{}'::jsonb,now()),
  ('00000000-0000-4000-8000-000000000832','00000000-0000-4000-8000-000000000822','1.0.0',400,'USD','ecosystem.paid','approved','{}'::jsonb,now()),
  ('00000000-0000-4000-8000-000000000833','00000000-0000-4000-8000-000000000823','1.0.0',0,'USD','ecosystem.enterprise','approved','{}'::jsonb,now())
on conflict(id) do nothing;

do $$
declare
  v_user uuid:='00000000-0000-4000-8000-000000000801';
  v_referred uuid:='00000000-0000-4000-8000-000000000802';
  v_third uuid:='00000000-0000-4000-8000-000000000803';
  v_robot uuid:='00000000-0000-4000-8000-000000000811';
  v_free_version uuid:='00000000-0000-4000-8000-000000000831';
  v_paid_version uuid:='00000000-0000-4000-8000-000000000832';
  v_enterprise_version uuid:='00000000-0000-4000-8000-000000000833';
  v_free jsonb;
  v_paid jsonb;
  v_wallet jsonb;
  v_install jsonb;
  v_event uuid;
  v_code uuid;
  v_redeem jsonb;
  v_boost jsonb;
  v_course uuid:='00000000-0000-4000-8000-000000000840';
  v_module uuid:='00000000-0000-4000-8000-000000000841';
  v_enrollment uuid;
  v_assessment jsonb;
  v_public jsonb;
  v_community uuid:='00000000-0000-4000-8000-000000000850';
  v_referral_code text;
  v_relationship uuid;
  v_qualified jsonb;
  v_moderation uuid;
begin
  perform public.wrs_ensure_finance_account(null,'asset:plan8-funding:USD','asset','debit','USD');
  perform public.wrs_ensure_finance_account(v_user,'liability:wallet:'||v_user||':USD','liability','credit','USD');
  perform public.wrs_post_ledger_transaction(
    v_user,'test-funding','plan8-funding:'||v_user,'plan8-funding:'||v_user,null,null,
    jsonb_build_array(
      jsonb_build_object('accountCode','asset:plan8-funding:USD','direction','debit','amountMinor',1000,'currency','USD'),
      jsonb_build_object('accountCode','liability:wallet:'||v_user||':USD','direction','credit','amountMinor',1000,'currency','USD')
    ),jsonb_build_object('test','plan8')
  );

  v_free:=public.wrs_acquire_marketplace_item(v_user,v_robot,v_free_version,'plan8-free-acquire');
  if v_free->>'source'<>'free' or v_free->>'transactionId' is not null then raise exception 'free marketplace item created financial settlement: %',v_free; end if;
  v_paid:=public.wrs_acquire_marketplace_item(v_user,v_robot,v_paid_version,'plan8-paid-acquire');
  if v_paid->>'source'<>'wallet' or v_paid->>'transactionId' is null then raise exception 'paid marketplace item did not use wallet ledger: %',v_paid; end if;
  if (public.wrs_acquire_marketplace_item(v_user,v_robot,v_paid_version,'plan8-paid-acquire')->>'entitlementId')<>v_paid->>'entitlementId' then
    raise exception 'marketplace acquisition idempotency failed';
  end if;
  v_wallet:=public.wrs_wallet_snapshot(v_user,'USD');
  if (v_wallet->>'availableMinor')::bigint<>600 then raise exception 'marketplace purchase did not debit wallet exactly once: %',v_wallet; end if;

  begin
    perform public.wrs_acquire_marketplace_item(v_user,v_robot,v_enterprise_version,'plan8-tier-denied');
    raise exception 'expected marketplace package compatibility rejection';
  exception when others then
    if sqlerrm='expected marketplace package compatibility rejection' then raise; end if;
    if position('package' in lower(sqlerrm))=0 then raise; end if;
  end;

  v_install:=public.wrs_install_marketplace_item(v_user,v_robot,(v_paid->>'entitlementId')::uuid);
  if v_install->>'status'<>'installed' or v_install->>'skillSlug'<>'ecosystem.paid' then raise exception 'marketplace install failed: %',v_install; end if;
  if not exists(select 1 from public.robot_skills where robot_id=v_robot and skill_slug='ecosystem.paid' and verified=true) then
    raise exception 'marketplace install did not change authoritative robot skill state';
  end if;
  perform public.wrs_review_marketplace_item(v_user,'00000000-0000-4000-8000-000000000822'::uuid,5,'Verified purchase review');

  insert into public.reward_events(slug,name,starts_at,ends_at,status)
  values('plan8-event','Plan 8 Event',now()-interval '1 hour',now()+interval '1 hour','active') returning id into v_event;
  v_code:=public.wrs_create_event_reward_code(v_event,repeat('a',64),250,now()+interval '30 minutes',1);
  v_redeem:=public.wrs_redeem_event_code(v_user,repeat('a',64));
  if v_redeem->>'status'<>'redeemed' or (v_redeem->>'points')::integer<>250 then raise exception 'valid event code did not redeem'; end if;
  if public.wrs_redeem_event_code(v_user,repeat('a',64))->>'status'<>'already-redeemed' then raise exception 'duplicate event claim was not idempotent'; end if;
  begin
    perform public.wrs_redeem_event_code(v_third,repeat('a',64));
    raise exception 'expected exhausted event code rejection';
  exception when others then
    if sqlerrm='expected exhausted event code rejection' then raise; end if;
    if position('exhausted' in lower(sqlerrm))=0 then raise; end if;
  end;

  if public.wrs_reward_points_balance(v_user)<>250 then raise exception 'event reward did not post to point ledger'; end if;
  v_boost:=public.wrs_activate_reward_boost(v_user,v_robot,'quality-focus','plan8-boost-1');
  if v_boost->>'status'<>'active' or public.wrs_reward_points_balance(v_user)<>100 then raise exception 'boost did not atomically spend points: %',v_boost; end if;
  if (public.wrs_activate_reward_boost(v_user,v_robot,'quality-focus','plan8-boost-1')->>'activationId')<>v_boost->>'activationId' then
    raise exception 'boost activation idempotency failed';
  end if;

  begin
    update public.reward_point_events set amount=999 where user_id=v_user limit 1;
    raise exception 'expected reward ledger append-only rejection';
  exception when syntax_error_or_access_rule_violation then
    -- PostgreSQL does not support UPDATE ... LIMIT; handled by the real immutable update below.
    null;
  end;
  begin
    update public.reward_point_events set amount=999 where id=(select id from public.reward_point_events where user_id=v_user order by created_at limit 1);
    raise exception 'expected reward ledger append-only rejection';
  exception when others then
    if sqlerrm='expected reward ledger append-only rejection' then raise; end if;
    if position('append-only' in sqlerrm)=0 then raise; end if;
  end;

  insert into public.academy_courses(id,slug,title,description,pass_score,status)
  values(v_course,'plan8-course','Plan 8 Course','Assessment-backed course',80,'published');
  insert into public.academy_modules(id,course_id,slug,title,position,status)
  values(v_module,v_course,'module-1','Module 1',1,'published');
  v_enrollment:=public.wrs_enroll_academy_course(v_user,v_course);
  perform public.wrs_record_academy_progress(v_user,v_enrollment,v_module,100);
  v_assessment:=public.wrs_assess_academy_enrollment(v_enrollment,90,'plan8-assessor',jsonb_build_object('rubric','pass'));
  if v_assessment->>'status'<>'passed' or v_assessment->>'verificationId' is null then raise exception 'academy certificate was not issued after passing complete course'; end if;
  v_public:=public.wrs_verify_academy_certificate((v_assessment->>'verificationId')::uuid);
  if v_public->>'courseTitle'<>'Plan 8 Course' or v_public ? 'userId' or v_public ? 'email' or v_public ? 'phone' then
    raise exception 'public certificate verification is missing or leaks private identity: %',v_public;
  end if;

  insert into public.community_events(id,slug,title,description,starts_at,ends_at,capacity,status)
  values(v_community,'plan8-community','Plan 8 Community Event','Verified attendance event',now()-interval '10 minutes',now()+interval '1 hour',10,'published');
  perform public.wrs_join_community_event(v_user,v_community,true);
  perform public.wrs_verify_community_attendance(v_community,v_user,'plan8-attendance');
  if not exists(select 1 from public.community_event_participants where event_id=v_community and user_id=v_user and status='attended') then
    raise exception 'community attendance was not verified';
  end if;
  perform public.wrs_set_community_leaderboard_profile(v_user,true,'EcoPilot');
  if not exists(select 1 from public.community_leaderboard_profiles where user_id=v_user and opted_in=true and display_alias='EcoPilot') then
    raise exception 'leaderboard opt-in was not persisted';
  end if;
  v_moderation:=public.wrs_record_community_moderation('event',v_community::text,'note','test moderation','plan8-operator','{}'::jsonb);
  begin
    update public.community_moderation_actions set reason='rewritten' where id=v_moderation;
    raise exception 'expected moderation append-only rejection';
  exception when others then
    if sqlerrm='expected moderation append-only rejection' then raise; end if;
    if position('append-only' in sqlerrm)=0 then raise; end if;
  end;

  v_referral_code:=public.wrs_ensure_referral_profile(v_user);
  begin
    perform public.wrs_accept_referral(v_user,v_referral_code);
    raise exception 'expected self referral rejection';
  exception when others then
    if sqlerrm='expected self referral rejection' then raise; end if;
    if position('self referral' in lower(sqlerrm))=0 then raise; end if;
  end;
  v_relationship:=(public.wrs_accept_referral(v_referred,v_referral_code)->>'relationshipId')::uuid;
  insert into public.package_entitlements(user_id,package_slug,status,source,source_reference,activated_at)
  values(v_referred,'builder','active','payment','plan8-referral-payment',now()-interval '8 days');
  v_qualified:=public.wrs_qualify_referral(v_relationship);
  if v_qualified->>'status'<>'qualified' then raise exception 'verified paid referral did not qualify: %',v_qualified; end if;
  if public.wrs_reward_points_balance(v_referred)<>100 then raise exception 'referred reward points not posted'; end if;
  if public.wrs_reward_points_balance(v_user)<>475 then raise exception 'owner point ledger total is incorrect after boost, academy, attendance and referral: %',public.wrs_reward_points_balance(v_user); end if;

  if has_function_privilege('authenticated','public.wrs_qualify_referral(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.wrs_assess_academy_enrollment(uuid,numeric,text,jsonb)','EXECUTE')
     or has_function_privilege('authenticated','public.wrs_create_event_reward_code(uuid,text,integer,timestamptz,integer)','EXECUTE') then
    raise exception 'browser role can execute privileged ecosystem routines';
  end if;
  if not has_function_privilege('anon','public.wrs_verify_academy_certificate(uuid)','EXECUTE') then
    raise exception 'public certificate verification is not executable by anon';
  end if;
end;
$$;
