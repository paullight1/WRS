-- Plan 6 privacy hardening: deletion is a durable workflow rather than a
-- synchronous UI claim. Final storage deletion waits out any already-issued
-- two-hour signed upload grants, blocks new account-wide uploads, and only
-- tombstones database records after the private-object sweep succeeds.

alter table public.data_deletion_requests
  add column if not exists eligible_at timestamptz,
  add column if not exists claimed_at timestamptz,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text;

update public.data_deletion_requests
set eligible_at = coalesce(eligible_at, requested_at + interval '2 hours')
where eligible_at is null;

alter table public.data_deletion_requests
  alter column eligible_at set default (now() + interval '2 hours'),
  alter column eligible_at set not null;

create index if not exists data_deletion_requests_due_idx
  on public.data_deletion_requests(status,eligible_at,requested_at)
  where status in ('requested','failed');

create or replace function public.wrs_has_pending_data_deletion(p_user_id uuid,p_asset_id uuid default null)
returns boolean
language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.data_deletion_requests dr
    where dr.user_id=p_user_id
      and dr.status in ('requested','processing','failed')
      and (dr.asset_id is null or (p_asset_id is not null and dr.asset_id=p_asset_id))
  )
$$;

create or replace function public.wrs_request_data_deletion(
  p_user_id uuid,p_asset_id uuid default null,p_reason text default null
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_asset_id is not null and not exists(
    select 1 from public.data_assets
    where id=p_asset_id and user_id=p_user_id and status<>'deleted'
  ) then
    raise exception 'asset not found';
  end if;

  select id into v_id
  from public.data_deletion_requests
  where user_id=p_user_id
    and status in ('requested','processing','failed')
    and asset_id is not distinct from p_asset_id
  order by requested_at desc
  limit 1;
  if v_id is not null then return v_id; end if;

  insert into public.data_deletion_requests(user_id,asset_id,reason,eligible_at)
  values(p_user_id,p_asset_id,p_reason,now()+interval '2 hours')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_claim_next_data_deletion()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.data_deletion_requests%rowtype;
begin
  select * into v_request
  from public.data_deletion_requests
  where status in ('requested','failed')
    and eligible_at<=now()
    and attempt_count<8
  order by requested_at,id
  for update skip locked
  limit 1;

  if v_request.id is null then return null; end if;

  update public.data_deletion_requests
  set status='processing',claimed_at=now(),attempt_count=attempt_count+1,last_error=null
  where id=v_request.id;

  return jsonb_build_object(
    'requestId',v_request.id,
    'userId',v_request.user_id,
    'assetId',v_request.asset_id,
    'attempt',v_request.attempt_count+1
  );
end;
$$;

create or replace function public.wrs_complete_data_deletion(
  p_request_id uuid,p_storage_deleted boolean,p_audit_summary jsonb
)
returns void language plpgsql security definer set search_path='' as $$
declare v_request public.data_deletion_requests%rowtype;
begin
  select * into v_request
  from public.data_deletion_requests
  where id=p_request_id
  for update;

  if v_request.id is null or v_request.status<>'processing' then
    raise exception 'claimed deletion request not found';
  end if;

  if p_storage_deleted then
    update public.data_assets
    set status='deleted',deleted_at=now(),updated_at=now()
    where user_id=v_request.user_id
      and (v_request.asset_id is null or id=v_request.asset_id)
      and status<>'deleted';

    update public.data_submissions
    set status='deleted'
    where user_id=v_request.user_id
      and asset_id in (
        select id from public.data_assets
        where user_id=v_request.user_id
          and status='deleted'
          and (v_request.asset_id is null or id=v_request.asset_id)
      );

    update public.data_deletion_requests
    set status='completed',storage_deleted_at=now(),completed_at=now(),
        audit_summary=coalesce(p_audit_summary,'{}'::jsonb),last_error=null
    where id=v_request.id;
  else
    update public.data_deletion_requests
    set status='failed',claimed_at=null,
        eligible_at=now()+interval '30 minutes',
        completed_at=null,
        audit_summary=coalesce(p_audit_summary,'{}'::jsonb),
        last_error=left(coalesce(p_audit_summary->>'error','storage deletion failed'),500)
    where id=v_request.id;
  end if;
end;
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
  if exists(
    select 1 from public.data_deletion_requests
    where user_id=p_user_id and asset_id is null and status in ('requested','processing','failed')
  ) then
    raise exception 'account data deletion is in progress';
  end if;
  if not public.wrs_has_active_consent(p_user_id,p_purpose_slug,p_data_category) then
    raise exception 'active consent required';
  end if;
  select id into v_consent from public.consent_events
    where user_id=p_user_id and purpose_slug=p_purpose_slug and data_category=p_data_category and action='granted'
    order by occurred_at desc,id desc limit 1;
  insert into public.data_assets(
    user_id,purpose_slug,data_category,consent_event_id,storage_bucket,storage_path,mime_type,size_bytes
  ) values(
    p_user_id,p_purpose_slug,p_data_category,v_consent,p_storage_bucket,p_storage_path,p_mime_type,p_size_bytes
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_submit_data_asset(
  p_user_id uuid,p_asset_id uuid,p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_asset public.data_assets%rowtype; v_id uuid;
begin
  select * into v_asset from public.data_assets
  where id=p_asset_id and user_id=p_user_id for update;
  if v_asset.id is null then raise exception 'asset not found'; end if;
  if public.wrs_has_pending_data_deletion(p_user_id,p_asset_id) then
    raise exception 'data deletion is pending';
  end if;
  if v_asset.status<>'uploaded' or v_asset.scan_status<>'clean' then
    raise exception 'asset must be uploaded and scan_status=clean';
  end if;
  if not public.wrs_has_active_consent(p_user_id,v_asset.purpose_slug,v_asset.data_category) then
    raise exception 'active consent required';
  end if;
  insert into public.data_submissions(asset_id,user_id,status,submission_metadata)
  values(v_asset.id,p_user_id,'submitted',coalesce(p_metadata,'{}'::jsonb))
  on conflict(asset_id) do update set submission_metadata=excluded.submission_metadata
  returning id into v_id;
  update public.data_assets set status='submitted',updated_at=now() where id=v_asset.id;
  return v_id;
end;
$$;

revoke all on function public.wrs_has_pending_data_deletion(uuid,uuid) from public,anon,authenticated;
revoke all on function public.wrs_request_data_deletion(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_claim_next_data_deletion() from public,anon,authenticated;
revoke all on function public.wrs_complete_data_deletion(uuid,boolean,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_register_data_asset(uuid,text,text,text,text,text,bigint) from public,anon,authenticated;
revoke all on function public.wrs_submit_data_asset(uuid,uuid,jsonb) from public,anon,authenticated;

grant execute on function public.wrs_has_pending_data_deletion(uuid,uuid) to service_role;
grant execute on function public.wrs_request_data_deletion(uuid,uuid,text) to service_role;
grant execute on function public.wrs_claim_next_data_deletion() to service_role;
grant execute on function public.wrs_complete_data_deletion(uuid,boolean,jsonb) to service_role;
grant execute on function public.wrs_register_data_asset(uuid,text,text,text,text,text,bigint) to service_role;
grant execute on function public.wrs_submit_data_asset(uuid,uuid,jsonb) to service_role;
