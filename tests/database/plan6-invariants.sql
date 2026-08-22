\set ON_ERROR_STOP on

insert into auth.users(id,email,phone)
values ('00000000-0000-4000-8000-000000000601','privacy@example.com','+2348012345601')
on conflict (id) do nothing;
insert into public.user_profiles(
  user_id,full_name,normalized_email,normalized_phone,status,terms_version,privacy_version,
  email_verified_at,phone_verified_at,kyc_status
) values (
  '00000000-0000-4000-8000-000000000601','Privacy Test','privacy@example.com','+2348012345601',
  'active','2026-01','2026-01',now(),now(),'verified'
) on conflict(user_id) do nothing;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-000000000601';
  v_consent bigint;
  v_asset uuid;
  v_submission uuid;
  v_review jsonb;
  v_dataset uuid;
  v_license uuid;
  v_distribution jsonb;
  v_wallet jsonb;
  v_request uuid;
  v_export jsonb;
begin
  if public.wrs_has_active_consent(v_user,'dataset-contribution','document') then
    raise exception 'consent unexpectedly active before grant';
  end if;

  v_consent:=public.wrs_record_consent(v_user,'dataset-contribution',1,'document','granted','NG','{}'::jsonb);
  if v_consent is null or not public.wrs_has_active_consent(v_user,'dataset-contribution','document') then
    raise exception 'consent grant did not become active';
  end if;

  v_asset:=public.wrs_register_data_asset(v_user,'dataset-contribution','document','wrs-private-data',v_user||'/document/test.pdf','application/pdf',1024);
  perform public.wrs_mark_data_asset_uploaded(v_asset,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','pending');
  begin
    perform public.wrs_submit_data_asset(v_user,v_asset,'{}'::jsonb);
    raise exception 'expected pending scan rejection';
  exception when others then
    if sqlerrm='expected pending scan rejection' then raise; end if;
    if position('scan_status=clean' in sqlerrm)=0 then raise; end if;
  end;

  perform public.wrs_update_asset_scan(v_asset,'clean');
  v_submission:=public.wrs_submit_data_asset(v_user,v_asset,jsonb_build_object('source','plan6-test'));
  v_review:=public.wrs_review_data_submission(v_submission,90,90,90,90,90,100,'clean approved test');
  if v_review->>'status'<>'approved' then raise exception 'high-quality clean submission not approved'; end if;

  -- Licensing requires its own independent consent purpose.
  insert into public.datasets(name,purpose,status) values('Plan6 dataset','Privacy test','active') returning id into v_dataset;
  insert into public.dataset_items(dataset_id,submission_id,contributor_user_id)
  values(v_dataset,v_submission,v_user);
  insert into public.dataset_licenses(dataset_id,customer_reference,status,amount_minor,currency,external_reference,contributor_pool_bps)
  values(v_dataset,'customer-test','paid',10000,'USD','license-plan6-001',7000) returning id into v_license;

  begin
    perform public.wrs_distribute_dataset_license(v_license);
    raise exception 'expected licensing consent rejection';
  exception when others then
    if sqlerrm='expected licensing consent rejection' then raise; end if;
    if position('eligible consented contributors' in sqlerrm)=0 then raise; end if;
  end;

  perform public.wrs_record_consent(v_user,'research-licensing',1,'document','granted','NG','{}'::jsonb);
  v_distribution:=public.wrs_distribute_dataset_license(v_license);
  if v_distribution->>'status'<>'distributed' or (v_distribution->>'distributedAmountMinor')::bigint<>7000 then
    raise exception 'license contributor pool distribution is incorrect';
  end if;
  perform public.wrs_distribute_dataset_license(v_license);
  if (select count(*) from public.contributor_allocations where license_id=v_license and status='distributed')<>1 then
    raise exception 'license distribution is not idempotent';
  end if;
  v_wallet:=public.wrs_wallet_snapshot(v_user,'USD');
  if (v_wallet->>'availableMinor')::bigint<>7000 then raise exception 'data distribution did not credit wallet ledger'; end if;

  -- Withdrawing licensing consent blocks future licensing without deleting historical evidence.
  perform public.wrs_record_consent(v_user,'research-licensing',1,'document','withdrawn','NG','{}'::jsonb);
  if public.wrs_has_active_consent(v_user,'research-licensing','document') then raise exception 'withdrawn consent remained active'; end if;
  if (select count(*) from public.consent_events where user_id=v_user and purpose_slug='research-licensing' and data_category='document')<>2 then
    raise exception 'consent provenance was overwritten instead of appended';
  end if;

  -- Export returns audit evidence without exposing raw private storage object bytes.
  v_export:=public.wrs_prepare_data_export(v_user);
  if v_export->>'status'<>'ready' or v_export->'manifest' is null then raise exception 'data export not prepared'; end if;
  if (v_export->'manifest')::text like '%storage_path%' then raise exception 'export leaked private storage path'; end if;

  -- Deletion request alone does not falsely claim asset deletion.
  v_request:=public.wrs_request_data_deletion(v_user,v_asset,'test deletion');
  if (select status from public.data_assets where id=v_asset)='deleted' then raise exception 'request prematurely marked asset deleted'; end if;
  perform public.wrs_complete_data_deletion(v_request,false,jsonb_build_object('error','simulated storage failure'));
  if (select status from public.data_assets where id=v_asset)='deleted' then raise exception 'failed storage deletion marked asset deleted'; end if;

  v_request:=public.wrs_request_data_deletion(v_user,v_asset,'retry deletion');
  perform public.wrs_complete_data_deletion(v_request,true,jsonb_build_object('deletedObjects',1));
  if (select status from public.data_assets where id=v_asset)<>'deleted' then raise exception 'successful storage deletion did not tombstone asset'; end if;
  if (select status from public.data_submissions where id=v_submission)<>'deleted' then raise exception 'asset deletion did not tombstone submission'; end if;

  -- Consent events are immutable audit evidence.
  begin
    update public.consent_events set action='granted' where id=v_consent;
    raise exception 'expected consent append-only rejection';
  exception when others then
    if sqlerrm='expected consent append-only rejection' then raise; end if;
    if position('append-only' in sqlerrm)=0 then raise; end if;
  end;
end;
$$;
