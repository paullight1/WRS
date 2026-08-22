-- Plan 8 hardening: entitlement insertion rechecks ownership and package compatibility.
create or replace function public.wrs_marketplace_entitlement_guard()
returns trigger language plpgsql set search_path='' as $$
declare
  v_robot public.robots%rowtype;
  v_item public.marketplace_items%rowtype;
begin
  select * into v_robot from public.robots where id=new.robot_id and owner_user_id=new.user_id and lifecycle='active';
  if v_robot.id is null then raise exception 'marketplace entitlement robot ownership mismatch'; end if;

  select i.* into v_item
  from public.marketplace_versions v
  join public.marketplace_items i on i.id=v.item_id
  where v.id=new.version_id and v.verification_status='approved' and i.status='published';
  if v_item.id is null then raise exception 'marketplace entitlement requires an approved published version'; end if;

  if public.wrs_package_rank(v_robot.package_slug) < public.wrs_package_rank(v_item.min_package_slug) then
    raise exception 'robot package does not meet marketplace item requirement';
  end if;
  return new;
end;
$$;

drop trigger if exists marketplace_entitlement_guard on public.marketplace_entitlements;
create trigger marketplace_entitlement_guard
before insert or update of user_id,robot_id,version_id,status on public.marketplace_entitlements
for each row when (new.status='active') execute function public.wrs_marketplace_entitlement_guard();
