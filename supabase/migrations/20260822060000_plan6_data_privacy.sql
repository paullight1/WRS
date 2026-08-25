-- WRS Plan 6: auditable consent, sensitive-data lifecycle, quality review,
-- deletion/export and dataset licensing/distribution.

create table if not exists public.consent_purposes (
  slug text primary key,
  description text not null,
  licensable boolean not null default false,
  created_at timestamptz not null default now()
);
insert into public.consent_purposes(slug,description,licensable) values
  ('personal-robot','Use contributed data only to personalize the owner robot',false),
  ('dataset-contribution','Use contributed data in WRS training/evaluation datasets',false),
  ('research-licensing','Allow approved contributed data to participate in explicitly licensed datasets',true)
on conflict (slug) do update set description=excluded.description, licensable=excluded.licensable;

create table if not exists public.consent_versions (
  purpose_slug text not null references public.consent_purposes(slug) on delete restrict,
  version integer not null check (version > 0),
  policy_hash text not null,
  policy_url text,
  effective_at timestamptz not null default now(),
  retired_at timestamptz,
  primary key (purpose_slug, version)
);

insert into public.consent_versions(purpose_slug,version,policy_hash) values
  ('personal-robot',1,'wrs-personal-robot-v1'),
  ('dataset-contribution',1,'wrs-dataset-contribution-v1'),
  ('research-licensing',1,'wrs-research-licensing-v1')
on conflict (purpose_slug,version) do nothing;

create table if not exists public.consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  purpose_slug text not null,
  policy_version integer not null,
  data_category text not null check (data_category in ('voice','face','movement','document','text','image','video','conversation')),
  action text not null check (action in ('granted','withdrawn')),
  jurisdiction text,
  context jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  foreign key (purpose_slug,policy_version) references public.consent_versions(purpose_slug,version) on delete restrict
);
create index if not exists consent_events_subject_idx on public.consent_events(user_id,purpose_slug,data_category,occurred_at desc,id desc);

create table if not exists public.data_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  purpose_slug text not null references public.consent_purposes(slug) on delete restrict,
  data_category text not null check (data_category in ('voice','face','movement','document','text','image','video','conversation')),
  consent_event_id bigint not null references public.consent_events(id) on delete restrict,
  storage_bucket text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  checksum_sha256 text,
  scan_status text not null default 'pending' check (scan_status in ('pending','clean','infected','failed')),
  status text not null default 'draft' check (status in ('draft','uploaded','submitted','processing','review','approved','rejected','deleted')),
  uploaded_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists data_assets_user_status_idx on public.data_assets(user_id,status,created_at desc);

create table if not exists public.data_submissions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null unique references public.data_assets(id) on delete restrict,
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  status text not null default 'submitted' check (status in ('draft','submitted','processing','review','approved','rejected','deleted')),
  submission_metadata jsonb not null default '{}'::jsonb,
  completeness numeric(5,2),
  accuracy numeric(5,2),
  consistency numeric(5,2),
  signal_quality numeric(5,2),
  reviewer_agreement numeric(5,2),
  policy_compliance numeric(5,2),
  quality_score numeric(5,2),
  review_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  asset_id uuid references public.data_assets(id) on delete restrict,
  status text not null default 'requested' check (status in ('requested','processing','completed','failed')),
  reason text,
  storage_deleted_at timestamptz,
  completed_at timestamptz,
  audit_summary jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now()
);

create table if not exists public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','processing','ready','expired','failed')),
  export_manifest jsonb,
  expires_at timestamptz,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purpose text not null,
  status text not null default 'draft' check (status in ('draft','review','active','retired')),
  created_at timestamptz not null default now()
);

create table if not exists public.dataset_items (
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  submission_id uuid not null references public.data_submissions(id) on delete restrict,
  contributor_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  allocation_bps integer not null default 0 check (allocation_bps between 0 and 10000),
  added_at timestamptz not null default now(),
  primary key (dataset_id,submission_id)
);

create table if not exists public.dataset_licenses (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets(id) on delete restrict,
  customer_reference text not null,
  status text not null default 'pending' check (status in ('pending','paid','active','expired','refunded','revoked')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  external_reference text not null unique,
  licensed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.contributor_allocations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.dataset_licenses(id) on delete restrict,
  contributor_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','distributed','reversed')),
  created_at timestamptz not null default now(),
  distributed_at timestamptz,
  unique(license_id,contributor_user_id)
);

alter table public.consent_purposes enable row level security;
alter table public.consent_versions enable row level security;
alter table public.consent_events enable row level security;
alter table public.data_assets enable row level security;
alter table public.data_submissions enable row level security;
alter table public.data_deletion_requests enable row level security;
alter table public.data_export_requests enable row level security;
alter table public.datasets enable row level security;
alter table public.dataset_items enable row level security;
alter table public.dataset_licenses enable row level security;
alter table public.contributor_allocations enable row level security;

revoke insert,update,delete on public.consent_purposes,public.consent_versions from anon,authenticated;
grant select on public.consent_purposes,public.consent_versions to authenticated;
revoke all on public.consent_events,public.data_assets,public.data_submissions,public.data_deletion_requests,
  public.data_export_requests,public.datasets,public.dataset_items,public.dataset_licenses,public.contributor_allocations
  from anon,authenticated;

create or replace function public.wrs_data_append_only()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'privacy evidence is append-only';
end;
$$;
drop trigger if exists consent_events_append_only on public.consent_events;
create trigger consent_events_append_only before update or delete on public.consent_events
for each row execute function public.wrs_data_append_only();

create or replace function public.wrs_record_consent(
  p_user_id uuid,
  p_purpose_slug text,
  p_policy_version integer,
  p_data_category text,
  p_action text,
  p_jurisdiction text,
  p_context jsonb default '{}'::jsonb
)
returns bigint
language plpgsql security definer set search_path='' as $$
declare v_id bigint;
begin
  if p_action not in ('granted','withdrawn') then raise exception 'invalid consent action'; end if;
  if not exists(select 1 from public.consent_versions where purpose_slug=p_purpose_slug and version=p_policy_version and retired_at is null) then
    raise exception 'consent policy version is not active';
  end if;
  insert into public.consent_events(user_id,purpose_slug,policy_version,data_category,action,jurisdiction,context)
  values(p_user_id,p_purpose_slug,p_policy_version,p_data_category,p_action,p_jurisdiction,coalesce(p_context,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_has_active_consent(p_user_id uuid,p_purpose_slug text,p_data_category text)
returns boolean
language sql stable security definer set search_path='' as $$
  with current_version as (
    select max(version) version from public.consent_versions where purpose_slug=p_purpose_slug and retired_at is null and effective_at<=now()
  ), latest as (
    select action,policy_version from public.consent_events
    where user_id=p_user_id and purpose_slug=p_purpose_slug and data_category=p_data_category
    order by occurred_at desc,id desc limit 1
  )
  select coalesce((select action='granted' and policy_version=(select version from current_version) from latest),false)
$$;

create or replace function public.wrs_register_data_asset(
  p_user_id uuid,p_purpose_slug text,p_data_category text,p_storage_bucket text,p_storage_path text,
  p_mime_type text,p_size_bytes bigint
)
returns uuid
language plpgsql security definer set search_path='' as $$
declare v_consent bigint; v_id uuid;
begin
  if p_size_bytes<=0 or p_size_bytes>52428800 then raise exception 'asset size exceeds policy'; end if;
  if not public.wrs_has_active_consent(p_user_id,p_purpose_slug,p_data_category) then raise exception 'active consent required'; end if;
  select id into v_consent from public.consent_events
    where user_id=p_user_id and purpose_slug=p_purpose_slug and data_category=p_data_category and action='granted'
    order by occurred_at desc,id desc limit 1;
  insert into public.data_assets(user_id,purpose_slug,data_category,consent_event_id,storage_bucket,storage_path,mime_type,size_bytes)
  values(p_user_id,p_purpose_slug,p_data_category,v_consent,p_storage_bucket,p_storage_path,p_mime_type,p_size_bytes)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_mark_data_asset_uploaded(
  p_asset_id uuid,p_checksum_sha256 text,p_scan_status text default 'pending'
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_scan_status not in ('pending','clean','infected','failed') then raise exception 'invalid scan status'; end if;
  update public.data_assets set status='uploaded',checksum_sha256=p_checksum_sha256,scan_status=p_scan_status,uploaded_at=now(),updated_at=now()
  where id=p_asset_id and status='draft';
  if not found then raise exception 'asset is not uploadable'; end if;
end;
$$;

create or replace function public.wrs_update_asset_scan(p_asset_id uuid,p_scan_status text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_scan_status not in ('clean','infected','failed') then raise exception 'invalid final scan status'; end if;
  update public.data_assets set scan_status=p_scan_status,updated_at=now() where id=p_asset_id and status<>'deleted';
  if not found then raise exception 'asset not found'; end if;
end;
$$;

create or replace function public.wrs_submit_data_asset(p_user_id uuid,p_asset_id uuid,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_asset public.data_assets%rowtype; v_id uuid;
begin
  select * into v_asset from public.data_assets where id=p_asset_id and user_id=p_user_id for update;
  if v_asset.id is null then raise exception 'asset not found'; end if;
  if v_asset.status<>'uploaded' or v_asset.scan_status<>'clean' then raise exception 'asset must be uploaded and scan_status=clean'; end if;
  if not public.wrs_has_active_consent(p_user_id,v_asset.purpose_slug,v_asset.data_category) then raise exception 'active consent required'; end if;
  insert into public.data_submissions(asset_id,user_id,status,submission_metadata)
  values(v_asset.id,p_user_id,'submitted',coalesce(p_metadata,'{}'::jsonb))
  on conflict(asset_id) do update set submission_metadata=excluded.submission_metadata
  returning id into v_id;
  update public.data_assets set status='submitted',updated_at=now() where id=v_asset.id;
  return v_id;
end;
$$;

create or replace function public.wrs_review_data_submission(
  p_submission_id uuid,p_completeness numeric,p_accuracy numeric,p_consistency numeric,p_signal_quality numeric,
  p_reviewer_agreement numeric,p_policy_compliance numeric,p_notes text default null
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_score numeric; v_status text; v_asset uuid;
begin
  if p_completeness not between 0 and 100 or p_accuracy not between 0 and 100 or p_consistency not between 0 and 100
     or p_signal_quality not between 0 and 100 or p_reviewer_agreement not between 0 and 100 or p_policy_compliance not between 0 and 100 then
    raise exception 'quality dimensions out of range';
  end if;
  if p_policy_compliance<100 then v_score:=0; else
    v_score:=round(p_completeness*.20+p_accuracy*.25+p_consistency*.15+p_signal_quality*.15+p_reviewer_agreement*.25,2);
  end if;
  v_status:=case when v_score>=80 then 'approved' when v_score>=60 then 'review' else 'rejected' end;
  update public.data_submissions set status=v_status,completeness=p_completeness,accuracy=p_accuracy,consistency=p_consistency,
    signal_quality=p_signal_quality,reviewer_agreement=p_reviewer_agreement,policy_compliance=p_policy_compliance,
    quality_score=v_score,review_notes=p_notes,reviewed_at=now()
  where id=p_submission_id returning asset_id into v_asset;
  if v_asset is null then raise exception 'submission not found'; end if;
  update public.data_assets set status=v_status,updated_at=now() where id=v_asset;
  return jsonb_build_object('status',v_status,'qualityScore',v_score);
end;
$$;

create or replace function public.wrs_request_data_deletion(p_user_id uuid,p_asset_id uuid default null,p_reason text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_asset_id is not null and not exists(select 1 from public.data_assets where id=p_asset_id and user_id=p_user_id) then raise exception 'asset not found'; end if;
  insert into public.data_deletion_requests(user_id,asset_id,reason) values(p_user_id,p_asset_id,p_reason) returning id into v_id;
  update public.data_assets set status='deleted',deleted_at=now(),updated_at=now()
    where user_id=p_user_id and (p_asset_id is null or id=p_asset_id) and status<>'deleted';
  update public.data_submissions set status='deleted'
    where user_id=p_user_id and asset_id in (select id from public.data_assets where user_id=p_user_id and status='deleted');
  return v_id;
end;
$$;

create or replace function public.wrs_complete_data_deletion(p_request_id uuid,p_storage_deleted boolean,p_audit_summary jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.data_deletion_requests set status=case when p_storage_deleted then 'completed' else 'failed' end,
    storage_deleted_at=case when p_storage_deleted then now() else null end,completed_at=now(),audit_summary=coalesce(p_audit_summary,'{}'::jsonb)
  where id=p_request_id and status in ('requested','processing');
  if not found then raise exception 'deletion request not found'; end if;
end;
$$;

create or replace function public.wrs_prepare_data_export(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_manifest jsonb;
begin
  v_manifest:=jsonb_build_object(
    'consents',(select coalesce(jsonb_agg(jsonb_build_object('purpose',purpose_slug,'version',policy_version,'category',data_category,'action',action,'occurredAt',occurred_at) order by occurred_at),'[]'::jsonb) from public.consent_events where user_id=p_user_id),
    'assets',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'purpose',purpose_slug,'category',data_category,'mimeType',mime_type,'sizeBytes',size_bytes,'scanStatus',scan_status,'status',status,'createdAt',created_at) order by created_at),'[]'::jsonb) from public.data_assets where user_id=p_user_id),
    'submissions',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'assetId',asset_id,'status',status,'qualityScore',quality_score,'submittedAt',submitted_at) order by submitted_at),'[]'::jsonb) from public.data_submissions where user_id=p_user_id)
  );
  insert into public.data_export_requests(user_id,status,export_manifest,expires_at,completed_at)
  values(p_user_id,'ready',v_manifest,now()+interval '24 hours',now()) returning id into v_id;
  return jsonb_build_object('requestId',v_id,'status','ready','expiresAt',now()+interval '24 hours','manifest',v_manifest);
end;
$$;

create or replace function public.wrs_distribute_dataset_license(p_license_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_license public.dataset_licenses%rowtype; v_item record; v_count integer; v_each bigint; v_remainder bigint; v_index integer:=0; v_tx uuid; v_wallet_code text; v_expense_code text;
begin
  select * into v_license from public.dataset_licenses where id=p_license_id for update;
  if v_license.id is null or v_license.status not in ('paid','active') then raise exception 'paid dataset license required'; end if;
  if exists(select 1 from public.contributor_allocations where license_id=p_license_id and status='distributed') then
    return jsonb_build_object('status','already-distributed');
  end if;
  select count(distinct di.contributor_user_id) into v_count
  from public.dataset_items di join public.data_submissions s on s.id=di.submission_id join public.data_assets a on a.id=s.asset_id
  where di.dataset_id=v_license.dataset_id and s.status='approved' and a.scan_status='clean' and a.status='approved'
    and public.wrs_has_active_consent(di.contributor_user_id,'research-licensing',a.data_category);
  if v_count<=0 then raise exception 'license has no eligible consented contributors'; end if;
  v_each:=v_license.amount_minor/v_count; v_remainder:=v_license.amount_minor-(v_each*v_count);
  v_expense_code:='expense:data-royalties:'||v_license.currency;
  perform public.wrs_ensure_finance_account(null,v_expense_code,'expense','debit',v_license.currency);
  for v_item in
    select distinct di.contributor_user_id
    from public.dataset_items di join public.data_submissions s on s.id=di.submission_id join public.data_assets a on a.id=s.asset_id
    where di.dataset_id=v_license.dataset_id and s.status='approved' and a.scan_status='clean' and a.status='approved'
      and public.wrs_has_active_consent(di.contributor_user_id,'research-licensing',a.data_category)
    order by di.contributor_user_id
  loop
    v_index:=v_index+1;
    if v_index=1 then v_each:=v_each+v_remainder; end if;
    v_wallet_code:='liability:wallet:'||v_item.contributor_user_id||':'||v_license.currency;
    perform public.wrs_ensure_finance_account(v_item.contributor_user_id,v_wallet_code,'liability','credit',v_license.currency);
    v_tx:=public.wrs_post_ledger_transaction(
      v_item.contributor_user_id,'dataset-license-distribution','dataset-license:'||v_license.id||':'||v_item.contributor_user_id,
      'dataset-license:'||v_license.id||':'||v_item.contributor_user_id,null,null,
      jsonb_build_array(
        jsonb_build_object('accountCode',v_expense_code,'direction','debit','amountMinor',v_each,'currency',v_license.currency),
        jsonb_build_object('accountCode',v_wallet_code,'direction','credit','amountMinor',v_each,'currency',v_license.currency)
      ),jsonb_build_object('datasetLicenseId',v_license.id)
    );
    insert into public.contributor_allocations(license_id,contributor_user_id,amount_minor,currency,ledger_transaction_id,status,distributed_at)
    values(v_license.id,v_item.contributor_user_id,v_each,v_license.currency,v_tx,'distributed',now())
    on conflict(license_id,contributor_user_id) do nothing;
    v_each:=v_license.amount_minor/v_count;
  end loop;
  update public.dataset_licenses set status='active',licensed_at=coalesce(licensed_at,now()) where id=v_license.id;
  return jsonb_build_object('status','distributed','contributors',v_count,'amountMinor',v_license.amount_minor,'currency',v_license.currency);
end;
$$;

revoke all on function public.wrs_record_consent(uuid,text,integer,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_has_active_consent(uuid,text,text) from public,anon,authenticated;
revoke all on function public.wrs_register_data_asset(uuid,text,text,text,text,text,bigint) from public,anon,authenticated;
revoke all on function public.wrs_mark_data_asset_uploaded(uuid,text,text) from public,anon,authenticated;
revoke all on function public.wrs_update_asset_scan(uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_submit_data_asset(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_review_data_submission(uuid,numeric,numeric,numeric,numeric,numeric,numeric,text) from public,anon,authenticated;
revoke all on function public.wrs_request_data_deletion(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_complete_data_deletion(uuid,boolean,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_prepare_data_export(uuid) from public,anon,authenticated;
revoke all on function public.wrs_distribute_dataset_license(uuid) from public,anon,authenticated;

grant execute on function public.wrs_record_consent(uuid,text,integer,text,text,text,jsonb) to service_role;
grant execute on function public.wrs_has_active_consent(uuid,text,text) to service_role;
grant execute on function public.wrs_register_data_asset(uuid,text,text,text,text,text,bigint) to service_role;
grant execute on function public.wrs_mark_data_asset_uploaded(uuid,text,text) to service_role;
grant execute on function public.wrs_update_asset_scan(uuid,text) to service_role;
grant execute on function public.wrs_submit_data_asset(uuid,uuid,jsonb) to service_role;
grant execute on function public.wrs_review_data_submission(uuid,numeric,numeric,numeric,numeric,numeric,numeric,text) to service_role;
grant execute on function public.wrs_request_data_deletion(uuid,uuid,text) to service_role;
grant execute on function public.wrs_complete_data_deletion(uuid,boolean,jsonb) to service_role;
grant execute on function public.wrs_prepare_data_export(uuid) to service_role;
grant execute on function public.wrs_distribute_dataset_license(uuid) to service_role;
