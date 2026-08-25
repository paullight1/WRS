-- WRS Plan 7: authoritative deployment opportunities, eligibility, contracts,
-- state transitions, append-only work evidence and ledger-backed settlement.

create table if not exists public.deployment_industries (
  slug text primary key,
  name text not null,
  regulated boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.deployment_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  external_reference text unique,
  status text not null default 'active' check (status in ('active','suspended','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.deployment_opportunities (
  id uuid primary key default gen_random_uuid(),
  industry_slug text not null references public.deployment_industries(slug) on delete restrict,
  client_id uuid not null references public.deployment_clients(id) on delete restrict,
  title text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','open','paused','closed')),
  min_package_slug text not null default 'professional'
    check (min_package_slug in ('starter','builder','professional','enterprise','elite','visionary')),
  required_skills text[] not null default '{}',
  required_certifications text[] not null default '{}',
  min_quality_score numeric(5,2) not null default 0 check (min_quality_score between 0 and 100),
  require_kyc boolean not null default true,
  regulated boolean not null default false,
  allowed_countries text[] not null default '{}',
  rate_minor bigint not null check (rate_minor > 0),
  rate_unit text not null default 'hour' check (rate_unit in ('hour','task')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  slots integer not null default 1 check (slots > 0),
  auto_match boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  terms_template jsonb not null default '{}'::jsonb check (jsonb_typeof(terms_template)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at>starts_at)
);
create index if not exists deployment_opportunities_open_idx
  on public.deployment_opportunities(status,industry_slug,starts_at);

create table if not exists public.deployment_preferences (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  available boolean not null default true,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  timezone text,
  updated_at timestamptz not null default now()
);

create table if not exists public.deployment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  robot_id uuid not null references public.robots(id) on delete restrict,
  opportunity_id uuid not null references public.deployment_opportunities(id) on delete restrict,
  status text not null default 'requested' check (status in ('requested','matched','accepted','rejected','cancelled')),
  eligibility_snapshot jsonb not null,
  idempotency_key text not null unique,
  requested_at timestamptz not null default now(),
  matched_at timestamptz,
  decided_at timestamptz
);
create unique index if not exists deployment_requests_one_open_idx
  on public.deployment_requests(user_id,opportunity_id)
  where status in ('requested','matched','accepted');

create table if not exists public.deployment_contracts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.deployment_requests(id) on delete restrict,
  status text not null default 'offered' check (status in ('offered','accepted','declined','void')),
  rate_minor bigint not null check (rate_minor > 0),
  rate_unit text not null check (rate_unit in ('hour','task')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  terms_snapshot jsonb not null check (jsonb_typeof(terms_snapshot)='object'),
  offered_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz
);

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  robot_id uuid not null references public.robots(id) on delete restrict,
  opportunity_id uuid not null references public.deployment_opportunities(id) on delete restrict,
  request_id uuid not null unique references public.deployment_requests(id) on delete restrict,
  contract_id uuid not null unique references public.deployment_contracts(id) on delete restrict,
  status text not null default 'scheduled' check (status in ('scheduled','active','paused','completed','cancelled','failed')),
  version bigint not null default 1 check (version > 0),
  acceptance_idempotency_key text not null unique,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists deployments_one_concurrent_robot_idx
  on public.deployments(robot_id)
  where status in ('scheduled','active','paused');

create table if not exists public.deployment_events (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid references public.deployments(id) on delete restrict,
  request_id uuid references public.deployment_requests(id) on delete restrict,
  event_type text not null,
  from_state text,
  to_state text,
  actor_user_id uuid references public.user_profiles(user_id) on delete set null,
  reason text,
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (deployment_id is not null or request_id is not null)
);

create table if not exists public.deployment_work_logs (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.deployments(id) on delete restrict,
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  task_reference text not null,
  duration_minutes integer not null default 0 check (duration_minutes between 0 and 1440),
  units numeric(14,3) not null default 0 check (units >= 0),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  check (duration_minutes > 0 or units > 0)
);
create index if not exists deployment_work_logs_deployment_idx
  on public.deployment_work_logs(deployment_id,recorded_at,id);

create table if not exists public.deployment_work_verifications (
  id uuid primary key default gen_random_uuid(),
  work_log_id uuid not null unique references public.deployment_work_logs(id) on delete restrict,
  status text not null check (status in ('verified','rejected')),
  quality_score numeric(5,2) not null check (quality_score between 0 and 100),
  verifier_reference text not null,
  evidence jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now()
);

create table if not exists public.deployment_incidents (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.deployments(id) on delete restrict,
  reporter_user_id uuid references public.user_profiles(user_id) on delete set null,
  severity text not null check (severity in ('low','medium','high','critical')),
  summary text not null,
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.deployment_settlements (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null unique references public.deployments(id) on delete restrict,
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  verified_work_count integer not null check (verified_work_count > 0),
  ledger_transaction_id uuid not null unique references public.ledger_transactions(id) on delete restrict,
  status text not null default 'settled' check (status in ('settled','reversed')),
  settled_at timestamptz not null default now()
);

alter table public.deployment_industries enable row level security;
alter table public.deployment_clients enable row level security;
alter table public.deployment_opportunities enable row level security;
alter table public.deployment_preferences enable row level security;
alter table public.deployment_requests enable row level security;
alter table public.deployment_contracts enable row level security;
alter table public.deployments enable row level security;
alter table public.deployment_events enable row level security;
alter table public.deployment_work_logs enable row level security;
alter table public.deployment_work_verifications enable row level security;
alter table public.deployment_incidents enable row level security;
alter table public.deployment_settlements enable row level security;

revoke all on public.deployment_industries,public.deployment_clients,public.deployment_opportunities,
  public.deployment_preferences,public.deployment_requests,public.deployment_contracts,public.deployments,
  public.deployment_events,public.deployment_work_logs,public.deployment_work_verifications,
  public.deployment_incidents,public.deployment_settlements from anon,authenticated;

create or replace function public.wrs_deployment_append_only()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'deployment evidence is append-only';
end;
$$;

drop trigger if exists deployment_events_append_only on public.deployment_events;
create trigger deployment_events_append_only before update or delete on public.deployment_events
for each row execute function public.wrs_deployment_append_only();
drop trigger if exists deployment_work_logs_append_only on public.deployment_work_logs;
create trigger deployment_work_logs_append_only before update or delete on public.deployment_work_logs
for each row execute function public.wrs_deployment_append_only();
drop trigger if exists deployment_work_verifications_append_only on public.deployment_work_verifications;
create trigger deployment_work_verifications_append_only before update or delete on public.deployment_work_verifications
for each row execute function public.wrs_deployment_append_only();
drop trigger if exists deployment_incidents_append_only on public.deployment_incidents;
create trigger deployment_incidents_append_only before update or delete on public.deployment_incidents
for each row execute function public.wrs_deployment_append_only();

create or replace function public.wrs_deployment_contract_terms_immutable()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.rate_minor<>old.rate_minor or new.rate_unit<>old.rate_unit or new.currency<>old.currency or new.terms_snapshot<>old.terms_snapshot then
    raise exception 'deployment contract commercial terms are immutable';
  end if;
  return new;
end;
$$;
drop trigger if exists deployment_contract_terms_immutable on public.deployment_contracts;
create trigger deployment_contract_terms_immutable before update on public.deployment_contracts
for each row execute function public.wrs_deployment_contract_terms_immutable();

create or replace function public.wrs_deployment_package_rank(p_slug text)
returns integer language sql immutable set search_path='' as $$
  select case p_slug
    when 'starter' then 1 when 'builder' then 2 when 'professional' then 3
    when 'enterprise' then 4 when 'elite' then 5 when 'visionary' then 6 else 0 end
$$;

create or replace function public.wrs_deployment_quality_score(p_user_id uuid)
returns numeric language sql stable security definer set search_path='' as $$
  select coalesce(round(avg(quality_score),2),0)
  from (
    select quality_score from public.data_submissions
    where user_id=p_user_id and status='approved' and quality_score is not null
    order by reviewed_at desc nulls last
    limit 50
  ) recent
$$;

create or replace function public.wrs_deployment_eligibility(
  p_user_id uuid,p_robot_id uuid,p_opportunity_id uuid
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_robot public.robots%rowtype;
  v_profile public.user_profiles%rowtype;
  v_opportunity public.deployment_opportunities%rowtype;
  v_preference public.deployment_preferences%rowtype;
  v_quality numeric:=0;
  v_reasons text[]:='{}';
  v_skill text;
  v_cert text;
begin
  select * into v_robot from public.robots where id=p_robot_id and owner_user_id=p_user_id;
  select * into v_profile from public.user_profiles where user_id=p_user_id;
  select * into v_opportunity from public.deployment_opportunities where id=p_opportunity_id;
  select * into v_preference from public.deployment_preferences where user_id=p_user_id;
  v_quality:=public.wrs_deployment_quality_score(p_user_id);

  if v_robot.id is null then v_reasons:=array_append(v_reasons,'robot-ownership');
  elsif v_robot.lifecycle<>'active' then v_reasons:=array_append(v_reasons,'lifecycle'); end if;
  if v_profile.user_id is null or v_profile.status<>'active' then v_reasons:=array_append(v_reasons,'account-status'); end if;
  if v_opportunity.id is null or v_opportunity.status<>'open' then v_reasons:=array_append(v_reasons,'opportunity'); end if;

  if v_robot.id is not null and v_opportunity.id is not null then
    if public.wrs_deployment_package_rank(v_robot.package_slug)<public.wrs_deployment_package_rank(v_opportunity.min_package_slug) then
      v_reasons:=array_append(v_reasons,'package');
    end if;
    if v_opportunity.require_kyc and coalesce(v_profile.kyc_status,'unverified')<>'verified' then
      v_reasons:=array_append(v_reasons,'kyc');
    end if;
    if v_quality<v_opportunity.min_quality_score then v_reasons:=array_append(v_reasons,'quality'); end if;
    if not coalesce(v_preference.available,true) then v_reasons:=array_append(v_reasons,'availability'); end if;
    if cardinality(v_opportunity.allowed_countries)>0 and (
      v_preference.country_code is null or not (upper(v_preference.country_code)=any(v_opportunity.allowed_countries))
    ) then v_reasons:=array_append(v_reasons,'location'); end if;
    if exists(
      select 1 from public.deployments d
      where d.robot_id=v_robot.id and d.status in ('scheduled','active','paused')
    ) then v_reasons:=array_append(v_reasons,'availability'); end if;
    if v_opportunity.regulated and not exists(
      select 1 from public.package_capabilities pc
      where pc.package_slug=v_robot.package_slug and pc.capability_slug='deployment.regulated'
    ) then v_reasons:=array_append(v_reasons,'regulated-capability'); end if;

    foreach v_skill in array v_opportunity.required_skills loop
      if not exists(
        select 1 from public.robot_skills rs
        where rs.robot_id=v_robot.id and rs.skill_slug=v_skill and rs.verified=true
      ) then v_reasons:=array_append(v_reasons,'skill:'||v_skill); end if;
    end loop;
    foreach v_cert in array v_opportunity.required_certifications loop
      if not exists(
        select 1 from public.robot_certifications rc
        where rc.robot_id=v_robot.id and rc.certification_slug=v_cert and rc.status='active'
          and (rc.expires_at is null or rc.expires_at>now())
      ) then v_reasons:=array_append(v_reasons,'certification:'||v_cert); end if;
    end loop;
  end if;

  return jsonb_build_object(
    'eligible',cardinality(v_reasons)=0,
    'reasons',to_jsonb(v_reasons),
    'evidence',jsonb_build_object(
      'package',v_robot.package_slug,
      'robotLifecycle',v_robot.lifecycle,
      'kyc',v_profile.kyc_status,
      'quality',v_quality,
      'available',coalesce(v_preference.available,true),
      'country',v_preference.country_code
    )
  );
end;
$$;

create or replace function public.wrs_match_deployment_request(p_request_id uuid,p_terms_override jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_request public.deployment_requests%rowtype;
  v_opportunity public.deployment_opportunities%rowtype;
  v_contract uuid;
  v_eligibility jsonb;
begin
  select * into v_request from public.deployment_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'deployment request not found'; end if;
  select id into v_contract from public.deployment_contracts where request_id=v_request.id;
  if v_contract is not null then return v_contract; end if;
  if v_request.status<>'requested' then raise exception 'deployment request is not matchable'; end if;
  select * into v_opportunity from public.deployment_opportunities where id=v_request.opportunity_id and status='open' for update;
  if v_opportunity.id is null then raise exception 'opportunity is not open'; end if;
  v_eligibility:=public.wrs_deployment_eligibility(v_request.user_id,v_request.robot_id,v_request.opportunity_id);
  if not coalesce((v_eligibility->>'eligible')::boolean,false) then raise exception 'deployment request is no longer eligible'; end if;
  if (
    select count(*) from public.deployment_requests
    where opportunity_id=v_opportunity.id and status in ('matched','accepted')
  )>=v_opportunity.slots then raise exception 'opportunity capacity is full'; end if;

  insert into public.deployment_contracts(request_id,status,rate_minor,rate_unit,currency,terms_snapshot)
  values(
    v_request.id,'offered',v_opportunity.rate_minor,v_opportunity.rate_unit,v_opportunity.currency,
    v_opportunity.terms_template || coalesce(p_terms_override,'{}'::jsonb) || jsonb_build_object(
      'opportunityId',v_opportunity.id,'title',v_opportunity.title,'rateMinor',v_opportunity.rate_minor,
      'rateUnit',v_opportunity.rate_unit,'currency',v_opportunity.currency,
      'startsAt',v_opportunity.starts_at,'endsAt',v_opportunity.ends_at
    )
  ) returning id into v_contract;
  update public.deployment_requests set status='matched',matched_at=now() where id=v_request.id;
  insert into public.deployment_events(request_id,event_type,from_state,to_state,metadata)
  values(v_request.id,'request.matched','requested','matched',jsonb_build_object('contractId',v_contract));
  return v_contract;
end;
$$;

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

create or replace function public.wrs_accept_deployment_contract(
  p_user_id uuid,p_contract_id uuid,p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_contract public.deployment_contracts%rowtype;
  v_request public.deployment_requests%rowtype;
  v_opportunity public.deployment_opportunities%rowtype;
  v_deployment public.deployments%rowtype;
  v_eligibility jsonb;
begin
  select * into v_deployment from public.deployments where acceptance_idempotency_key=p_idempotency_key;
  if v_deployment.id is not null then
    if v_deployment.user_id<>p_user_id or v_deployment.contract_id<>p_contract_id then raise exception 'contract idempotency key collision'; end if;
    return jsonb_build_object('status','scheduled','deploymentId',v_deployment.id);
  end if;

  select * into v_contract from public.deployment_contracts where id=p_contract_id for update;
  if v_contract.id is null or v_contract.status<>'offered' then raise exception 'deployment contract is not available'; end if;
  select * into v_request from public.deployment_requests where id=v_contract.request_id for update;
  if v_request.user_id<>p_user_id or v_request.status<>'matched' then raise exception 'deployment contract ownership mismatch'; end if;
  select * into v_opportunity from public.deployment_opportunities where id=v_request.opportunity_id;
  v_eligibility:=public.wrs_deployment_eligibility(p_user_id,v_request.robot_id,v_request.opportunity_id);
  if not coalesce((v_eligibility->>'eligible')::boolean,false) then raise exception 'deployment is no longer eligible'; end if;

  update public.deployment_contracts set status='accepted',accepted_at=now() where id=v_contract.id;
  update public.deployment_requests set status='accepted',decided_at=now() where id=v_request.id;
  insert into public.deployments(
    user_id,robot_id,opportunity_id,request_id,contract_id,status,acceptance_idempotency_key,scheduled_start,scheduled_end
  ) values(
    p_user_id,v_request.robot_id,v_request.opportunity_id,v_request.id,v_contract.id,'scheduled',p_idempotency_key,
    v_opportunity.starts_at,v_opportunity.ends_at
  ) returning * into v_deployment;
  insert into public.deployment_events(deployment_id,request_id,event_type,to_state,actor_user_id,idempotency_key)
  values(v_deployment.id,v_request.id,'deployment.scheduled','scheduled',p_user_id,'deployment-scheduled:'||v_deployment.id);
  return jsonb_build_object('status','scheduled','deploymentId',v_deployment.id);
end;
$$;

create or replace function public.wrs_transition_deployment(
  p_user_id uuid,p_deployment_id uuid,p_next_state text,p_reason text,p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_deployment public.deployments%rowtype;
  v_event uuid;
  v_allowed boolean:=false;
begin
  select id into v_event from public.deployment_events where idempotency_key=p_idempotency_key;
  if v_event is not null then
    select * into v_deployment from public.deployments where id=p_deployment_id and user_id=p_user_id;
    if v_deployment.id is null then raise exception 'deployment ownership mismatch'; end if;
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

create or replace function public.wrs_record_deployment_work(
  p_user_id uuid,p_deployment_id uuid,p_task_reference text,p_duration_minutes integer,p_units numeric,
  p_metadata jsonb,p_idempotency_key text
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_existing public.deployment_work_logs%rowtype;
begin
  select * into v_existing from public.deployment_work_logs where idempotency_key=p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.user_id<>p_user_id or v_existing.deployment_id<>p_deployment_id then raise exception 'work idempotency key collision'; end if;
    return v_existing.id;
  end if;
  if not exists(
    select 1 from public.deployments where id=p_deployment_id and user_id=p_user_id and status='active'
  ) then raise exception 'active deployment ownership required'; end if;
  if coalesce(p_duration_minutes,0)<0 or coalesce(p_duration_minutes,0)>1440 or coalesce(p_units,0)<0
     or (coalesce(p_duration_minutes,0)=0 and coalesce(p_units,0)=0) then raise exception 'invalid work evidence'; end if;
  insert into public.deployment_work_logs(
    deployment_id,user_id,task_reference,duration_minutes,units,idempotency_key,metadata
  ) values(
    p_deployment_id,p_user_id,trim(p_task_reference),coalesce(p_duration_minutes,0),coalesce(p_units,0),p_idempotency_key,coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_verify_deployment_work(
  p_work_log_id uuid,p_status text,p_quality_score numeric,p_verifier_reference text,p_evidence jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_existing public.deployment_work_verifications%rowtype;
begin
  if p_status not in ('verified','rejected') or p_quality_score not between 0 and 100 then raise exception 'invalid work verification'; end if;
  if not exists(select 1 from public.deployment_work_logs where id=p_work_log_id) then raise exception 'work log not found'; end if;
  select * into v_existing from public.deployment_work_verifications where work_log_id=p_work_log_id;
  if v_existing.id is not null then
    if v_existing.status<>p_status or v_existing.verifier_reference<>p_verifier_reference then raise exception 'work verification conflict'; end if;
    return v_existing.id;
  end if;
  insert into public.deployment_work_verifications(work_log_id,status,quality_score,verifier_reference,evidence)
  values(p_work_log_id,p_status,p_quality_score,p_verifier_reference,coalesce(p_evidence,'{}'::jsonb)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_report_deployment_incident(
  p_user_id uuid,p_deployment_id uuid,p_severity text,p_summary text,p_idempotency_key text,p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_severity not in ('low','medium','high','critical') then raise exception 'invalid incident severity'; end if;
  if not exists(select 1 from public.deployments where id=p_deployment_id and user_id=p_user_id) then raise exception 'deployment ownership mismatch'; end if;
  select id into v_id from public.deployment_incidents where idempotency_key=p_idempotency_key;
  if v_id is not null then return v_id; end if;
  insert into public.deployment_incidents(deployment_id,reporter_user_id,severity,summary,idempotency_key,metadata)
  values(p_deployment_id,p_user_id,p_severity,left(trim(p_summary),1000),p_idempotency_key,coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_settle_deployment(p_deployment_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_deployment public.deployments%rowtype;
  v_contract public.deployment_contracts%rowtype;
  v_existing public.deployment_settlements%rowtype;
  v_count integer;
  v_minutes bigint;
  v_units numeric;
  v_amount bigint;
  v_tx uuid;
  v_wallet_code text;
  v_expense_code text;
begin
  select * into v_deployment from public.deployments where id=p_deployment_id for update;
  if v_deployment.id is null or v_deployment.status<>'completed' then raise exception 'completed deployment required'; end if;
  select * into v_existing from public.deployment_settlements where deployment_id=v_deployment.id;
  if v_existing.id is not null then
    return jsonb_build_object('status','already-settled','settlementId',v_existing.id,'amountMinor',v_existing.amount_minor,'currency',v_existing.currency);
  end if;
  select * into v_contract from public.deployment_contracts where id=v_deployment.contract_id and status='accepted';
  if v_contract.id is null then raise exception 'accepted contract required'; end if;

  select count(*),coalesce(sum(w.duration_minutes),0),coalesce(sum(w.units),0)
  into v_count,v_minutes,v_units
  from public.deployment_work_logs w
  join public.deployment_work_verifications v on v.work_log_id=w.id and v.status='verified'
  where w.deployment_id=v_deployment.id;
  if v_count<=0 then raise exception 'verified deployment work required'; end if;

  if v_contract.rate_unit='hour' then
    v_amount:=floor((v_minutes::numeric*v_contract.rate_minor)/60.0)::bigint;
  else
    v_amount:=floor(v_units*v_contract.rate_minor)::bigint;
  end if;
  if v_amount<=0 then raise exception 'verified work has zero settlement value'; end if;

  v_wallet_code:='liability:wallet:'||v_deployment.user_id||':'||v_contract.currency;
  v_expense_code:='expense:deployment:'||v_contract.currency;
  perform public.wrs_ensure_finance_account(v_deployment.user_id,v_wallet_code,'liability','credit',v_contract.currency);
  perform public.wrs_ensure_finance_account(null,v_expense_code,'expense','debit',v_contract.currency);
  v_tx:=public.wrs_post_ledger_transaction(
    v_deployment.user_id,'deployment-settlement','deployment:'||v_deployment.id,
    'deployment-settlement:'||v_deployment.id,null,null,
    jsonb_build_array(
      jsonb_build_object('accountCode',v_expense_code,'direction','debit','amountMinor',v_amount,'currency',v_contract.currency),
      jsonb_build_object('accountCode',v_wallet_code,'direction','credit','amountMinor',v_amount,'currency',v_contract.currency)
    ),
    jsonb_build_object('deploymentId',v_deployment.id,'verifiedWorkCount',v_count,'rateUnit',v_contract.rate_unit,'rateMinor',v_contract.rate_minor)
  );
  insert into public.deployment_settlements(deployment_id,user_id,amount_minor,currency,verified_work_count,ledger_transaction_id)
  values(v_deployment.id,v_deployment.user_id,v_amount,v_contract.currency,v_count,v_tx)
  returning * into v_existing;
  return jsonb_build_object('status','settled','settlementId',v_existing.id,'amountMinor',v_amount,'currency',v_contract.currency,'verifiedWorkCount',v_count);
end;
$$;

revoke all on function public.wrs_deployment_package_rank(text) from public,anon,authenticated;
revoke all on function public.wrs_deployment_quality_score(uuid) from public,anon,authenticated;
revoke all on function public.wrs_deployment_eligibility(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.wrs_match_deployment_request(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_request_deployment(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_accept_deployment_contract(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_transition_deployment(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.wrs_record_deployment_work(uuid,uuid,text,integer,numeric,jsonb,text) from public,anon,authenticated;
revoke all on function public.wrs_verify_deployment_work(uuid,text,numeric,text,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_report_deployment_incident(uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_settle_deployment(uuid) from public,anon,authenticated;

grant execute on function public.wrs_deployment_package_rank(text) to service_role;
grant execute on function public.wrs_deployment_quality_score(uuid) to service_role;
grant execute on function public.wrs_deployment_eligibility(uuid,uuid,uuid) to service_role;
grant execute on function public.wrs_match_deployment_request(uuid,jsonb) to service_role;
grant execute on function public.wrs_request_deployment(uuid,uuid,uuid,text) to service_role;
grant execute on function public.wrs_accept_deployment_contract(uuid,uuid,text) to service_role;
grant execute on function public.wrs_transition_deployment(uuid,uuid,text,text,text) to service_role;
grant execute on function public.wrs_record_deployment_work(uuid,uuid,text,integer,numeric,jsonb,text) to service_role;
grant execute on function public.wrs_verify_deployment_work(uuid,text,numeric,text,jsonb) to service_role;
grant execute on function public.wrs_report_deployment_incident(uuid,uuid,text,text,text,jsonb) to service_role;
grant execute on function public.wrs_settle_deployment(uuid) to service_role;
