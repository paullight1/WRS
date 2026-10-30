-- Referral approval depends on account verification, without a payment or waiting period.
-- Existing reward triggers and their idempotency remain unchanged.
create or replace function public.wrs_qualify_referral(p_relationship_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_relation public.referral_relationships%rowtype;
begin
  select * into v_relation
    from public.referral_relationships
    where id = p_relationship_id
    for update;
  if v_relation.id is null then raise exception 'referral relationship not found'; end if;
  if v_relation.status = 'qualified' then
    return jsonb_build_object('status', 'qualified', 'relationshipId', v_relation.id);
  end if;
  if v_relation.status <> 'pending' then raise exception 'referral is not qualifiable'; end if;
  if not exists (
    select 1 from public.user_profiles
    where user_id = v_relation.referred_user_id
      and status = 'active'
      and email_verified_at is not null
  ) then raise exception 'referred account verification incomplete'; end if;

  update public.referral_relationships
    set status = 'qualified', eligible_at = now(), qualified_at = now()
    where id = v_relation.id;
  return jsonb_build_object(
    'status', 'qualified', 'relationshipId', v_relation.id, 'rewardStatus', 'configured-xp-rbc'
  );
end;
$$;

revoke all on function public.wrs_qualify_referral(uuid) from public, anon, authenticated;
grant execute on function public.wrs_qualify_referral(uuid) to service_role;
