\set ON_ERROR_STOP on

-- Synthetic accounts only; every inserted row is rolled back after this check.
begin;

do $$
declare
  v_inviter uuid := gen_random_uuid();
  v_invited uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_code text;
  v_relationship uuid;
  v_other_relationship uuid;
  v_result jsonb;
  v_approved_at timestamptz;
begin
  insert into auth.users(id,email) values
    (v_inviter,v_inviter::text || '@example.test'),
    (v_invited,v_invited::text || '@example.test'),
    (v_other,v_other::text || '@example.test');
  insert into public.user_profiles(user_id,full_name,normalized_email,status,terms_version,privacy_version,email_verified_at)
    select id,'Referral test',email,'active','test','test',now()
    from auth.users where id in (v_inviter,v_invited,v_other);
  v_code := public.wrs_ensure_referral_profile(v_inviter);
  v_relationship := (public.wrs_accept_referral(v_invited,v_code)->>'relationshipId')::uuid;

  if exists(select 1 from public.package_entitlements where user_id=v_invited) then
    raise exception 'test account must not have a paid plan';
  end if;
  v_result := public.wrs_qualify_referral(v_relationship);
  if v_result->>'status'<>'qualified' then raise exception 'verified free account did not qualify immediately'; end if;
  if not exists(select 1 from public.referral_relationships where id=v_relationship
    and status='qualified' and eligible_at=now() and qualified_at=now()) then
    raise exception 'approval did not record immediate eligibility';
  end if;
  update public.referral_relationships set qualified_at=now()-interval '1 hour' where id=v_relationship;
  select qualified_at into v_approved_at from public.referral_relationships where id=v_relationship;
  perform public.wrs_qualify_referral(v_relationship);
  if not exists(select 1 from public.referral_relationships where id=v_relationship and qualified_at=v_approved_at) then
    raise exception 'repeat approval changed the original approval';
  end if;

  v_other_relationship := (public.wrs_accept_referral(v_other,v_code)->>'relationshipId')::uuid;
  update public.user_profiles set status='suspended' where user_id=v_other;
  begin
    perform public.wrs_qualify_referral(v_other_relationship);
    raise exception 'expected inactive account rejection';
  exception when others then
    if position('verification incomplete' in sqlerrm)=0 then raise; end if;
  end;
  update public.user_profiles set status='active',email_verified_at=null where user_id=v_other;
  begin
    perform public.wrs_qualify_referral(v_other_relationship);
    raise exception 'expected unverified email rejection';
  exception when others then
    if position('verification incomplete' in sqlerrm)=0 then raise; end if;
  end;
  if not exists(select 1 from public.referral_relationships where id=v_other_relationship and status='pending') then
    raise exception 'blocked approval changed referral status';
  end if;
  update public.user_profiles set email_verified_at=now() where user_id=v_other;
  update public.referral_relationships set status='rejected' where id=v_other_relationship;
  begin
    perform public.wrs_qualify_referral(v_other_relationship);
    raise exception 'expected rejected referral to remain rejected';
  exception when others then
    if position('not qualifiable' in sqlerrm)=0 then raise; end if;
  end;
  begin
    perform public.wrs_qualify_referral(gen_random_uuid());
    raise exception 'expected unknown referral rejection';
  exception when others then
    if position('not found' in sqlerrm)=0 then raise; end if;
  end;
  begin
    perform public.wrs_accept_referral(v_inviter,v_code);
    raise exception 'expected self referral rejection';
  exception when others then
    if position('self referral' in lower(sqlerrm))=0 then raise; end if;
  end;
  if has_function_privilege('anon','public.wrs_qualify_referral(uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.wrs_qualify_referral(uuid)','EXECUTE')
    or not has_function_privilege('service_role','public.wrs_qualify_referral(uuid)','EXECUTE') then
    raise exception 'referral approval permissions changed';
  end if;
end;
$$;

rollback;
