\set ON_ERROR_STOP on

insert into auth.users(id,email,phone) values
  ('00000000-0000-4000-8000-000000000701','deploy-owner@example.com','+2348012345701'),
  ('00000000-0000-4000-8000-000000000702','deploy-other@example.com','+2348012345702')
on conflict(id) do nothing;

insert into public.user_profiles(
  user_id,full_name,normalized_email,normalized_phone,status,terms_version,privacy_version,
  email_verified_at,phone_verified_at,kyc_status
) values
  ('00000000-0000-4000-8000-000000000701','Deploy Owner','deploy-owner@example.com','+2348012345701','active','2026-01','2026-01',now(),now(),'verified'),
  ('00000000-0000-4000-8000-000000000702','Deploy Other','deploy-other@example.com','+2348012345702','active','2026-01','2026-01',now(),now(),'verified')
on conflict(user_id) do nothing;

insert into public.robots(id,owner_user_id,name,lifecycle,package_slug,requested_package_slug)
values
  ('00000000-0000-4000-8000-000000000711','00000000-0000-4000-8000-000000000701','Deploy-701','active','professional','professional'),
  ('00000000-0000-4000-8000-000000000712','00000000-0000-4000-8000-000000000702','Deploy-702','active','professional','professional')
on conflict(id) do nothing;

insert into public.deployment_preferences(user_id,available,country_code,timezone) values
  ('00000000-0000-4000-8000-000000000701',true,'NG','Africa/Lagos'),
  ('00000000-0000-4000-8000-000000000702',true,'NG','Africa/Lagos')
on conflict(user_id) do update set available=excluded.available,country_code=excluded.country_code;

insert into public.robot_skills(robot_id,skill_slug,name,version,verified,source_reference)
values('00000000-0000-4000-8000-000000000711','warehouse.pick','Warehouse Picking','1',true,'plan7-skill')
on conflict(robot_id,skill_slug,version) do update set verified=true;

insert into public.robot_certifications(
  robot_id,certification_slug,name,issuer,issued_at,expires_at,verification_reference,status
) values(
  '00000000-0000-4000-8000-000000000711','safety-basic','Basic Site Safety','WRS Test',now()-interval '1 day',now()+interval '30 days','plan7-cert-701','active'
) on conflict(verification_reference) do nothing;

insert into public.deployment_industries(slug,name,regulated)
values('warehousing','Warehousing',false),('regulated-test','Regulated Test',true)
on conflict(slug) do update set active=true;

insert into public.deployment_clients(id,name,external_reference,status)
values('00000000-0000-4000-8000-000000000720','Plan 7 Client','plan7-client','active')
on conflict(id) do nothing;

insert into public.deployment_opportunities(
  id,industry_slug,client_id,title,description,status,min_package_slug,required_skills,
  required_certifications,min_quality_score,require_kyc,regulated,allowed_countries,
  rate_minor,rate_unit,currency,slots,auto_match,terms_template
) values
  (
    '00000000-0000-4000-8000-000000000721','warehousing','00000000-0000-4000-8000-000000000720',
    'Verified Warehouse Shift','Plan 7 success path','open','professional',array['warehouse.pick'],
    array['safety-basic'],0,true,false,array['NG'],1200,'hour','USD',1,false,
    jsonb_build_object('scope','verified shift','maxHours',8)
  ),
  (
    '00000000-0000-4000-8000-000000000722','regulated-test','00000000-0000-4000-8000-000000000720',
    'Regulated High Quality Shift','Plan 7 ineligible path','open','enterprise',array['missing.skill'],
    array['missing.cert'],80,true,true,array['GH'],1500,'hour','USD',1,false,
    '{}'::jsonb
  )
on conflict(id) do nothing;

do $$
declare
  v_user uuid:='00000000-0000-4000-8000-000000000701';
  v_other uuid:='00000000-0000-4000-8000-000000000702';
  v_robot uuid:='00000000-0000-4000-8000-000000000711';
  v_other_robot uuid:='00000000-0000-4000-8000-000000000712';
  v_opp uuid:='00000000-0000-4000-8000-000000000721';
  v_bad_opp uuid:='00000000-0000-4000-8000-000000000722';
  v_elig jsonb;
  v_result jsonb;
  v_request uuid;
  v_contract uuid;
  v_deployment uuid;
  v_work uuid;
  v_settlement jsonb;
  v_wallet jsonb;
  v_event_count integer;
begin
  v_elig:=public.wrs_deployment_eligibility(v_user,v_robot,v_bad_opp);
  if coalesce((v_elig->>'eligible')::boolean,true) then raise exception 'ineligible regulated opportunity passed'; end if;
  if not (v_elig->'reasons' ? 'package') or not (v_elig->'reasons' ? 'quality') or not (v_elig->'reasons' ? 'location')
     or not (v_elig->'reasons' ? 'skill:missing.skill') or not (v_elig->'reasons' ? 'certification:missing.cert')
     or not (v_elig->'reasons' ? 'regulated-capability') then
    raise exception 'eligibility did not report required evidence failures: %',v_elig;
  end if;

  v_result:=public.wrs_request_deployment(v_other,v_robot,v_opp,'plan7-cross-owner-request');
  if coalesce((v_result->'eligibility'->>'eligible')::boolean,true) then raise exception 'cross-owner robot request passed'; end if;

  v_result:=public.wrs_request_deployment(v_user,v_robot,v_opp,'plan7-request-701');
  if v_result->>'status'<>'requested' then raise exception 'eligible request was not created: %',v_result; end if;
  v_request:=(v_result->>'requestId')::uuid;

  -- Same resource with another browser idempotency key returns the existing request.
  v_result:=public.wrs_request_deployment(v_user,v_robot,v_opp,'plan7-request-701-retry');
  if (v_result->>'requestId')::uuid<>v_request then raise exception 'resource retry duplicated deployment request'; end if;
  if (select count(*) from public.deployment_requests where user_id=v_user and opportunity_id=v_opp)<>1 then
    raise exception 'deployment request duplicate exists';
  end if;

  -- Capacity reservation blocks another robot after the first open request.
  v_result:=public.wrs_request_deployment(v_other,v_other_robot,v_opp,'plan7-capacity-other');
  if v_result->>'status'<>'full' then raise exception 'opportunity capacity was not enforced: %',v_result; end if;

  v_contract:=public.wrs_match_deployment_request(v_request,jsonb_build_object('operationalNote','test'));
  if (select status from public.deployment_requests where id=v_request)<>'matched' then raise exception 'request was not matched'; end if;
  if (select terms_snapshot->>'rateMinor' from public.deployment_contracts where id=v_contract)<>'1200' then
    raise exception 'contract snapshot did not preserve authoritative rate';
  end if;
  begin
    update public.deployment_contracts set rate_minor=1 where id=v_contract;
    raise exception 'expected immutable contract terms';
  exception when others then
    if sqlerrm='expected immutable contract terms' then raise; end if;
    if position('immutable' in sqlerrm)=0 then raise; end if;
  end;

  v_result:=public.wrs_accept_deployment_contract(v_user,v_contract,'plan7-accept-701');
  if v_result->>'status'<>'scheduled' then raise exception 'contract acceptance failed'; end if;
  v_deployment:=(v_result->>'deploymentId')::uuid;
  v_result:=public.wrs_accept_deployment_contract(v_user,v_contract,'plan7-accept-701');
  if (v_result->>'deploymentId')::uuid<>v_deployment then raise exception 'contract acceptance was not idempotent'; end if;

  -- Work cannot be recorded before the deployment is active.
  begin
    perform public.wrs_record_deployment_work(v_user,v_deployment,'task-1',30,0,'{}'::jsonb,'plan7-work-too-early');
    raise exception 'expected inactive work rejection';
  exception when others then
    if sqlerrm='expected inactive work rejection' then raise; end if;
    if position('active deployment' in sqlerrm)=0 then raise; end if;
  end;

  perform public.wrs_transition_deployment(v_user,v_deployment,'active','owner started','plan7-state-active');
  v_work:=public.wrs_record_deployment_work(v_user,v_deployment,'task-1',30,0,jsonb_build_object('source','test'),'plan7-work-1');
  if public.wrs_record_deployment_work(v_user,v_deployment,'task-1',30,0,'{}'::jsonb,'plan7-work-1')<>v_work then
    raise exception 'work log idempotency failed';
  end if;

  begin
    perform public.wrs_settle_deployment(v_deployment);
    raise exception 'expected pre-completion settlement rejection';
  exception when others then
    if sqlerrm='expected pre-completion settlement rejection' then raise; end if;
    if position('completed deployment' in sqlerrm)=0 then raise; end if;
  end;

  perform public.wrs_verify_deployment_work(v_work,'verified',95,'plan7-verifier',jsonb_build_object('evidence','ok'));
  perform public.wrs_transition_deployment(v_user,v_deployment,'completed','verified work complete','plan7-state-complete');

  -- Reusing an event key for a different state is a payload conflict.
  begin
    perform public.wrs_transition_deployment(v_user,v_deployment,'failed','conflict','plan7-state-complete');
    raise exception 'expected transition idempotency conflict';
  exception when others then
    if sqlerrm='expected transition idempotency conflict' then raise; end if;
    if position('payload conflict' in sqlerrm)=0 then raise; end if;
  end;

  v_settlement:=public.wrs_settle_deployment(v_deployment);
  if v_settlement->>'status'<>'settled' or (v_settlement->>'amountMinor')::bigint<>600 then
    raise exception 'verified 30-minute settlement was incorrect: %',v_settlement;
  end if;
  v_result:=public.wrs_settle_deployment(v_deployment);
  if v_result->>'status'<>'already-settled' then raise exception 'deployment settlement was not idempotent'; end if;
  v_wallet:=public.wrs_wallet_snapshot(v_user,'USD');
  if (v_wallet->>'availableMinor')::bigint<>600 then raise exception 'deployment settlement did not credit owner ledger wallet'; end if;

  if (select count(*) from public.deployment_settlements where deployment_id=v_deployment)<>1 then
    raise exception 'duplicate deployment settlement exists';
  end if;
  if (
    select coalesce(sum(case when e.direction='debit' then e.amount_minor else -e.amount_minor end),0)
    from public.ledger_entries e
    join public.ledger_transactions t on t.id=e.transaction_id
    where t.reference='deployment:'||v_deployment
  )<>0 then raise exception 'deployment journal is not balanced'; end if;

  -- Append-only work/evidence cannot be rewritten after settlement.
  begin
    update public.deployment_work_logs set duration_minutes=60 where id=v_work;
    raise exception 'expected work log append-only rejection';
  exception when others then
    if sqlerrm='expected work log append-only rejection' then raise; end if;
    if position('append-only' in sqlerrm)=0 then raise; end if;
  end;

  select count(*) into v_event_count from public.deployment_events where deployment_id=v_deployment;
  if v_event_count<3 then raise exception 'deployment event audit trail is incomplete'; end if;
end;
$$;
