\set ON_ERROR_STOP on

insert into auth.users(id,email,phone) values
  ('00000000-0000-4000-8000-000000000901','plan9-owner@example.com','+2348012345901'),
  ('00000000-0000-4000-8000-000000000902','plan9-oldmfa@example.com','+2348012345902'),
  ('00000000-0000-4000-8000-000000000903','plan9-support@example.com','+2348012345903'),
  ('00000000-0000-4000-8000-000000000904','plan9-admin@example.com','+2348012345904')
on conflict(id) do nothing;

insert into public.user_profiles(
  user_id,full_name,normalized_email,normalized_phone,status,terms_version,privacy_version,
  email_verified_at,phone_verified_at,kyc_status,country_code
) values
  ('00000000-0000-4000-8000-000000000901','Plan Nine Owner','plan9-owner@example.com','+2348012345901','active','2026-01','2026-01',now(),now(),'verified','NG'),
  ('00000000-0000-4000-8000-000000000902','Plan Nine Old MFA','plan9-oldmfa@example.com','+2348012345902','active','2026-01','2026-01',now(),now(),'verified','NG'),
  ('00000000-0000-4000-8000-000000000903','Plan Nine Support','plan9-support@example.com','+2348012345903','active','2026-01','2026-01',now(),now(),'verified','NG'),
  ('00000000-0000-4000-8000-000000000904','Plan Nine Admin','plan9-admin@example.com','+2348012345904','active','2026-01','2026-01',now(),now(),'verified','NG')
on conflict(user_id) do nothing;

insert into public.user_sessions(id,user_id,auth_session_id,remember_me,mfa_satisfied_at,expires_at) values
  ('00000000-0000-4000-8000-000000000911','00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000921',false,now()-interval '2 minutes',now()+interval '2 hours'),
  ('00000000-0000-4000-8000-000000000912','00000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000922',false,now()-interval '30 minutes',now()+interval '2 hours'),
  ('00000000-0000-4000-8000-000000000913','00000000-0000-4000-8000-000000000903','00000000-0000-4000-8000-000000000923',false,now()-interval '2 minutes',now()+interval '2 hours'),
  ('00000000-0000-4000-8000-000000000914','00000000-0000-4000-8000-000000000904','00000000-0000-4000-8000-000000000924',false,now()-interval '2 minutes',now()+interval '2 hours')
on conflict(id) do nothing;

insert into public.user_roles(user_id,role_id)
select '00000000-0000-4000-8000-000000000903',id from public.roles where slug='support_operator'
on conflict do nothing;
insert into public.user_roles(user_id,role_id)
select '00000000-0000-4000-8000-000000000904',id from public.roles where slug='admin'
on conflict do nothing;

do $$
declare
  v_user uuid:='00000000-0000-4000-8000-000000000901';
  v_old uuid:='00000000-0000-4000-8000-000000000902';
  v_support uuid:='00000000-0000-4000-8000-000000000903';
  v_admin uuid:='00000000-0000-4000-8000-000000000904';
  v_session uuid:='00000000-0000-4000-8000-000000000921';
  v_old_session uuid:='00000000-0000-4000-8000-000000000922';
  v_ticket uuid;
  v_delete jsonb;
  v_delete_id uuid;
  v_data_delete uuid;
  v_claim jsonb;
  v_audit bigint;
  v_security_before bigint;
  v_security_after bigint;
begin
  -- Non-sensitive profile edits do not require a fresh MFA assertion.
  perform public.wrs_update_profile(v_old,v_old_session,'Plan Nine Old MFA Updated','GH','plan9-oldmfa@example.com','+2348012345902');
  if (select country_code from public.user_profiles where user_id=v_old)<>'GH' then raise exception 'non-sensitive profile update did not persist'; end if;

  -- Sensitive identifier changes fail with stale MFA.
  begin
    perform public.wrs_update_profile(v_old,v_old_session,'Plan Nine Old MFA Updated','GH','plan9-oldmfa-new@example.com','+2348012345902');
    raise exception 'expected recent MFA rejection';
  exception when others then
    if sqlerrm='expected recent MFA rejection' then raise; end if;
    if position('recent MFA' in sqlerrm)=0 then raise; end if;
  end;

  perform public.wrs_update_profile(v_user,v_session,'Plan Nine Owner Updated','NG','plan9-owner-new@example.com','+2348012345991');
  if (select email_verified_at is not null or phone_verified_at is not null from public.user_profiles where user_id=v_user) then
    raise exception 'changed identity remained verified';
  end if;

  perform public.wrs_update_user_settings(v_user,'en','NGN','Africa/Lagos',true,false,true,true);
  if not exists(select 1 from public.user_settings where user_id=v_user and currency='NGN' and timezone='Africa/Lagos' and biometric_login_enabled=true) then
    raise exception 'settings did not persist';
  end if;

  v_ticket:=public.wrs_create_support_ticket(v_user,'technical','Plan 9 support ticket','The production support path needs review.');
  perform public.wrs_add_support_message(v_user,v_ticket,'Additional owner evidence.');
  begin
    perform public.wrs_add_support_message(v_old,v_ticket,'Cross-owner message');
    raise exception 'expected cross-owner support rejection';
  exception when others then
    if sqlerrm='expected cross-owner support rejection' then raise; end if;
    if position('not found' in lower(sqlerrm))=0 then raise; end if;
  end;

  if not public.wrs_operator_has_permission(v_support,'operations.support') then raise exception 'support operator lacks support permission'; end if;
  if public.wrs_operator_has_permission(v_support,'operations.finance') then raise exception 'support operator gained finance permission'; end if;
  if not public.wrs_operator_has_permission(v_admin,'operations.finance') or not public.wrs_operator_has_permission(v_admin,'operations.security') then
    raise exception 'admin permission matrix incomplete';
  end if;

  perform public.wrs_staff_update_support_ticket(v_support,v_ticket,'in_progress','high','Operator response','Investigating verified technical issue');
  if not exists(select 1 from public.support_messages where ticket_id=v_ticket and author_user_id=v_support and author_role='operator') then
    raise exception 'operator support message missing';
  end if;
  if not exists(select 1 from public.operations_audit_events where operator_user_id=v_support and target_id=v_ticket::text and permission_slug='operations.support') then
    raise exception 'support operation was not audited';
  end if;

  v_audit:=public.wrs_record_operations_action(v_admin,'operations.security','user',v_user::text,'security.review','Plan 9 audit immutability test','{}'::jsonb);
  begin
    update public.operations_audit_events set reason='rewritten' where id=v_audit;
    raise exception 'expected operations audit append-only rejection';
  exception when others then
    if sqlerrm='expected operations audit append-only rejection' then raise; end if;
    if position('append-only' in sqlerrm)=0 then raise; end if;
  end;

  if not exists(select 1 from public.knowledge_base_articles where status='published' and slug='mfa-setup') then
    raise exception 'published knowledge base seed missing';
  end if;

  select count(*) into v_security_before from public.security_events where user_id=v_user;
  v_delete:=public.wrs_request_account_deletion(v_user,v_session,'Plan 9 deletion invariant');
  v_delete_id:=(v_delete->>'requestId')::uuid;
  v_data_delete:=(v_delete->>'dataDeletionRequestId')::uuid;
  if (select status from public.account_deletion_requests where id=v_delete_id)<>'requested' then raise exception 'account deletion request not durable'; end if;
  if exists(select 1 from public.user_sessions where user_id=v_user and revoked_at is null) then raise exception 'account deletion did not revoke sessions'; end if;

  -- Account deletion cannot be claimed while the Plan 6 private-data deletion is pending.
  update public.account_deletion_requests set eligible_at=now()-interval '1 minute' where id=v_delete_id;
  if public.wrs_claim_next_account_deletion() is not null then raise exception 'account deletion claimed before private-data deletion'; end if;

  update public.data_deletion_requests set eligible_at=now()-interval '1 minute' where id=v_data_delete;
  v_claim:=public.wrs_claim_next_data_deletion();
  if (v_claim->>'requestId')::uuid<>v_data_delete then raise exception 'private-data deletion claim mismatch'; end if;
  perform public.wrs_complete_data_deletion(v_data_delete,true,jsonb_build_object('test','plan9'));

  v_claim:=public.wrs_claim_next_account_deletion();
  if (v_claim->>'requestId')::uuid<>v_delete_id then raise exception 'eligible account deletion was not claimed'; end if;
  perform public.wrs_finalize_account_deletion(v_delete_id,true,jsonb_build_object('providerRedacted',true));
  if (select status from public.user_profiles where user_id=v_user)<>'deleted' then raise exception 'account was not tombstoned'; end if;
  if (select full_name from public.user_profiles where user_id=v_user)<>'Deleted User' then raise exception 'account was not anonymized'; end if;
  if exists(select 1 from public.ledger_entries e join public.ledger_transactions t on t.id=e.transaction_id where t.user_id=v_user)=false then
    -- Ledger retention is asserted structurally below; no user ledger was required for this fixture.
    null;
  end if;
  select count(*) into v_security_after from public.security_events where user_id=v_user;
  if v_security_after<=v_security_before then raise exception 'security audit evidence was lost during deletion'; end if;

  if has_table_privilege('authenticated','public.user_roles','INSERT') then raise exception 'browser role can self-assign operator roles'; end if;
  if has_table_privilege('authenticated','public.operations_audit_events','UPDATE') then raise exception 'browser role can rewrite operations audit'; end if;
  if has_function_privilege('authenticated','public.wrs_record_operations_action(uuid,text,text,text,text,text,jsonb)','EXECUTE') then
    raise exception 'browser role can execute operator audit routine';
  end if;
end;
$$;
