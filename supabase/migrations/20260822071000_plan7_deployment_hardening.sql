-- Plan 7 adversarial hardening: resource-level request retries return the
-- existing open request and globally unique idempotency keys cannot suppress
-- actions on another deployment or incident.

create or replace function public.wrs_request_deployment(
  p_user_id uuid,p_robot_id uuid,p_opportunity_id uuid,p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_existing public.deployment_requests%rowtype;
  v_request public.deployment_requests%rowtype;
  v_opportunity public.deployment_opportunities%rowtype;
  v_eligibility jsonb;
  v_contract uuid;
begin
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'idempotency key required'; end if;

  select * into v_existing from public.deployment_requests where idempotency_key=p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.user_id<>p_user_id or v_existing.robot_id<>p_robot_id or v_existing.opportunity_id<>p_opportunity_id then
      raise exception 'deployment idempotency key collision';
    end if;
    select id into v_contract from public.deployment_contracts where request_id=v_existing.id;
    return jsonb_build_object('status',v_existing.status,'requestId',v_existing.id,'contractId',v_contract,'eligibility',v_existing.eligibility_snapshot);
  end if;

  -- A second browser request for the same still-open opportunity is a resource
  -- retry even if the browser generated a new key. Return the existing record
  -- rather than throwing the partial unique-index violation.
  select * into v_existing
  from public.deployment_requests
  where user_id=p_user_id and robot_id=p_robot_id and opportunity_id=p_opportunity_id
    and status in ('requested','matched','accepted')
  order by requested_at desc
  limit 1;
  if v_existing.id is not null then
    select id into v_contract from public.deployment_contracts where request_id=v_existing.id;
    return jsonb_build_object('status',v_existing.status,'requestId',v_existing.id,'contractId',v_contract,'eligibility',v_existing.eligibility_snapshot);
  end if;

  select * into v_opportunity from public.deployment_opportunities where id=p_opportunity_id for update;
  v_eligibility:=public.wrs_deployment_eligibility(p_user_id,p_robot_id,p_opportunity_id);
  if not coalesce((v_eligibility->>'eligible')::boolean,false) then
    return jsonb_build_object('status','ineligible','eligibility',v_eligibility);
  end if;
  if (
    select count(*) from public.deployment_requests
    where opportunity_id=p_opportunity_id and status in ('requested','matched','accepted')
  )>=v_opportunity.slots then
    return jsonb_build_object('status','full','eligibility',v_eligibility);
  end if;

  insert into public.deployment_requests(user_id,robot_id,opportunity_id,status,eligibility_snapshot,idempotency_key)
  values(p_user_id,p_robot_id,p_opportunity_id,'requested',v_eligibility,p_idempotency_key)
  returning * into v_request;
  insert into public.deployment_events(request_id,event_type,to_state,actor_user_id,idempotency_key)
  values(v_request.id,'request.created','requested',p_user_id,'request:'||v_request.id);

  if v_opportunity.auto_match then v_contract:=public.wrs_match_deployment_request(v_request.id,'{}'::jsonb); end if;
  return jsonb_build_object(
    'status',case when v_contract is null then 'requested' else 'matched' end,
    'requestId',v_request.id,'contractId',v_contract,'eligibility',v_eligibility
  );
end;
$$;

create or replace function public.wrs_transition_deployment(
  p_user_id uuid,p_deployment_id uuid,p_next_state text,p_reason text,p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_deployment public.deployments%rowtype;
  v_existing_event public.deployment_events%rowtype;
  v_allowed boolean:=false;
begin
  select * into v_existing_event from public.deployment_events where idempotency_key=p_idempotency_key;
  if v_existing_event.id is not null then
    if v_existing_event.deployment_id is distinct from p_deployment_id then
      raise exception 'deployment state idempotency key collision';
    end if;
    select * into v_deployment from public.deployments where id=p_deployment_id and user_id=p_user_id;
    if v_deployment.id is null then raise exception 'deployment ownership mismatch'; end if;
    if v_existing_event.to_state is distinct from p_next_state then
      raise exception 'deployment state idempotency payload conflict';
    end if;
    return jsonb_build_object('status',v_deployment.status,'deploymentId',v_deployment.id,'version',v_deployment.version);
  end if;

  select * into v_deployment from public.deployments where id=p_deployment_id and user_id=p_user_id for update;
  if v_deployment.id is null then raise exception 'deployment ownership mismatch'; end if;
  v_allowed:=case v_deployment.status
    when 'scheduled' then p_next_state in ('active','cancelled','failed')
    when 'active' then p_next_state in ('paused','completed','failed')
    when 'paused' then p_next_state in ('active','cancelled','failed')
    else false end;
  if not v_allowed then raise exception 'invalid deployment transition: % -> %',v_deployment.status,p_next_state; end if;

  insert into public.deployment_events(
    deployment_id,request_id,event_type,from_state,to_state,actor_user_id,reason,idempotency_key
  ) values(
    v_deployment.id,v_deployment.request_id,'deployment.state',v_deployment.status,p_next_state,p_user_id,p_reason,p_idempotency_key
  );
  update public.deployments set
    status=p_next_state,version=version+1,updated_at=now(),
    started_at=case when p_next_state='active' and started_at is null then now() else started_at end,
    paused_at=case when p_next_state='paused' then now() else paused_at end,
    completed_at=case when p_next_state='completed' then now() else completed_at end,
    cancelled_at=case when p_next_state='cancelled' then now() else cancelled_at end,
    failed_at=case when p_next_state='failed' then now() else failed_at end
  where id=v_deployment.id returning * into v_deployment;
  return jsonb_build_object('status',v_deployment.status,'deploymentId',v_deployment.id,'version',v_deployment.version);
end;
$$;

create or replace function public.wrs_report_deployment_incident(
  p_user_id uuid,p_deployment_id uuid,p_severity text,p_summary text,p_idempotency_key text,p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_existing public.deployment_incidents%rowtype;
begin
  if p_severity not in ('low','medium','high','critical') then raise exception 'invalid incident severity'; end if;
  if not exists(select 1 from public.deployments where id=p_deployment_id and user_id=p_user_id) then raise exception 'deployment ownership mismatch'; end if;
  select * into v_existing from public.deployment_incidents where idempotency_key=p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.deployment_id<>p_deployment_id or v_existing.reporter_user_id is distinct from p_user_id then
      raise exception 'incident idempotency key collision';
    end if;
    if v_existing.severity<>p_severity or v_existing.summary<>left(trim(p_summary),1000) then
      raise exception 'incident idempotency payload conflict';
    end if;
    return v_existing.id;
  end if;
  insert into public.deployment_incidents(deployment_id,reporter_user_id,severity,summary,idempotency_key,metadata)
  values(p_deployment_id,p_user_id,p_severity,left(trim(p_summary),1000),p_idempotency_key,coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.wrs_request_deployment(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_transition_deployment(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.wrs_report_deployment_incident(uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.wrs_request_deployment(uuid,uuid,uuid,text) to service_role;
grant execute on function public.wrs_transition_deployment(uuid,uuid,text,text,text) to service_role;
grant execute on function public.wrs_report_deployment_incident(uuid,uuid,text,text,text,jsonb) to service_role;
