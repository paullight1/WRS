-- Plan 6 hardening: deletion is marked complete only after private object
-- deletion succeeds, and dataset licenses explicitly define the contributor
-- revenue pool rather than implicitly distributing 100% of gross license value.

alter table public.dataset_licenses
  add column if not exists contributor_pool_bps integer not null default 7000
  check (contributor_pool_bps between 0 and 10000);

create or replace function public.wrs_request_data_deletion(p_user_id uuid,p_asset_id uuid default null,p_reason text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_asset_id is not null and not exists(select 1 from public.data_assets where id=p_asset_id and user_id=p_user_id and status<>'deleted') then
    raise exception 'asset not found';
  end if;
  insert into public.data_deletion_requests(user_id,asset_id,reason)
  values(p_user_id,p_asset_id,p_reason)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_complete_data_deletion(p_request_id uuid,p_storage_deleted boolean,p_audit_summary jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_request public.data_deletion_requests%rowtype;
begin
  select * into v_request from public.data_deletion_requests where id=p_request_id for update;
  if v_request.id is null or v_request.status not in ('requested','processing') then raise exception 'deletion request not found'; end if;

  if p_storage_deleted then
    update public.data_assets set status='deleted',deleted_at=now(),updated_at=now()
      where user_id=v_request.user_id and (v_request.asset_id is null or id=v_request.asset_id) and status<>'deleted';
    update public.data_submissions set status='deleted'
      where user_id=v_request.user_id and asset_id in (
        select id from public.data_assets where user_id=v_request.user_id and status='deleted'
          and (v_request.asset_id is null or id=v_request.asset_id)
      );
  end if;

  update public.data_deletion_requests
  set status=case when p_storage_deleted then 'completed' else 'failed' end,
      storage_deleted_at=case when p_storage_deleted then now() else null end,
      completed_at=now(),
      audit_summary=coalesce(p_audit_summary,'{}'::jsonb)
  where id=v_request.id;
end;
$$;

create or replace function public.wrs_distribute_dataset_license(p_license_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_license public.dataset_licenses%rowtype;
  v_item record;
  v_count integer;
  v_pool bigint;
  v_each bigint;
  v_remainder bigint;
  v_index integer:=0;
  v_amount bigint;
  v_tx uuid;
  v_wallet_code text;
  v_expense_code text;
begin
  select * into v_license from public.dataset_licenses where id=p_license_id for update;
  if v_license.id is null or v_license.status not in ('paid','active') then raise exception 'paid dataset license required'; end if;
  if exists(select 1 from public.contributor_allocations where license_id=p_license_id and status='distributed') then
    return jsonb_build_object('status','already-distributed');
  end if;

  select count(distinct di.contributor_user_id) into v_count
  from public.dataset_items di
  join public.data_submissions s on s.id=di.submission_id
  join public.data_assets a on a.id=s.asset_id
  where di.dataset_id=v_license.dataset_id
    and s.status='approved' and a.scan_status='clean' and a.status='approved'
    and public.wrs_has_active_consent(di.contributor_user_id,'research-licensing',a.data_category);
  if v_count<=0 then raise exception 'license has no eligible consented contributors'; end if;

  v_pool := floor(v_license.amount_minor * v_license.contributor_pool_bps / 10000.0)::bigint;
  if v_pool<=0 then raise exception 'contributor pool is zero'; end if;
  v_each:=v_pool/v_count;
  v_remainder:=v_pool-(v_each*v_count);
  v_expense_code:='expense:data-royalties:'||v_license.currency;
  perform public.wrs_ensure_finance_account(null,v_expense_code,'expense','debit',v_license.currency);

  for v_item in
    select distinct di.contributor_user_id
    from public.dataset_items di
    join public.data_submissions s on s.id=di.submission_id
    join public.data_assets a on a.id=s.asset_id
    where di.dataset_id=v_license.dataset_id
      and s.status='approved' and a.scan_status='clean' and a.status='approved'
      and public.wrs_has_active_consent(di.contributor_user_id,'research-licensing',a.data_category)
    order by di.contributor_user_id
  loop
    v_index:=v_index+1;
    v_amount:=v_each + case when v_index=1 then v_remainder else 0 end;
    v_wallet_code:='liability:wallet:'||v_item.contributor_user_id||':'||v_license.currency;
    perform public.wrs_ensure_finance_account(v_item.contributor_user_id,v_wallet_code,'liability','credit',v_license.currency);
    v_tx:=public.wrs_post_ledger_transaction(
      v_item.contributor_user_id,'dataset-license-distribution',
      'dataset-license:'||v_license.id||':'||v_item.contributor_user_id,
      'dataset-license:'||v_license.id||':'||v_item.contributor_user_id,null,null,
      jsonb_build_array(
        jsonb_build_object('accountCode',v_expense_code,'direction','debit','amountMinor',v_amount,'currency',v_license.currency),
        jsonb_build_object('accountCode',v_wallet_code,'direction','credit','amountMinor',v_amount,'currency',v_license.currency)
      ),
      jsonb_build_object('datasetLicenseId',v_license.id,'grossLicenseAmountMinor',v_license.amount_minor,'contributorPoolBps',v_license.contributor_pool_bps)
    );
    insert into public.contributor_allocations(license_id,contributor_user_id,amount_minor,currency,ledger_transaction_id,status,distributed_at)
    values(v_license.id,v_item.contributor_user_id,v_amount,v_license.currency,v_tx,'distributed',now())
    on conflict(license_id,contributor_user_id) do nothing;
  end loop;

  update public.dataset_licenses set status='active',licensed_at=coalesce(licensed_at,now()) where id=v_license.id;
  return jsonb_build_object('status','distributed','contributors',v_count,'grossAmountMinor',v_license.amount_minor,'distributedAmountMinor',v_pool,'currency',v_license.currency);
end;
$$;

revoke all on function public.wrs_request_data_deletion(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_complete_data_deletion(uuid,boolean,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_distribute_dataset_license(uuid) from public,anon,authenticated;
grant execute on function public.wrs_request_data_deletion(uuid,uuid,text) to service_role;
grant execute on function public.wrs_complete_data_deletion(uuid,boolean,jsonb) to service_role;
grant execute on function public.wrs_distribute_dataset_license(uuid) to service_role;
