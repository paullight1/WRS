-- Scoped operator administration. Full-admin management remains a trusted owner procedure.
insert into public.permissions(slug,description)
values ('operations.roles','Administer scoped operator assignments')
on conflict(slug) do update set description=excluded.description;
delete from public.role_permissions rp using public.permissions p,public.roles r
where rp.permission_id=p.id and rp.role_id=r.id and p.slug='operations.roles' and r.slug<>'admin';
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.slug='admin' and p.slug='operations.roles' on conflict do nothing;

-- Preserve existing permissions, while making this scope admin-only even if a future mapping is mistaken.
create or replace function public.wrs_operator_has_permission(p_user_id uuid,p_permission text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
    left join public.role_permissions rp on rp.role_id=r.id left join public.permissions p on p.id=rp.permission_id
    where ur.user_id=p_user_id and (r.slug='admin' or (p_permission <> 'operations.roles' and p.slug=p_permission))
  )
$$;
revoke all on public.roles,public.permissions,public.role_permissions,public.user_roles from public,anon,authenticated;

create table public.operator_role_audit_events (
  id bigint generated always as identity primary key,
  subject_user_id uuid not null,
  role_slug text not null check (role_slug in ('admin','support_operator','kyc_operator','finance_operator','data_operator','deployment_operator','risk_operator','reward_operator')),
  operator_user_id uuid,
  actor_type text not null check (actor_type in ('admin','bootstrap')),
  actor_reference text not null,
  action text not null check (action in ('role.grant','role.revoke','role.bootstrap')),
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  occurred_at timestamptz not null default now(),
  check ((actor_type='admin' and operator_user_id is not null and actor_reference=operator_user_id::text and action in ('role.grant','role.revoke'))
    or (actor_type='bootstrap' and operator_user_id is null and actor_reference='service_role:initial-admin' and action='role.bootstrap'))
);
-- UUIDs are durable audit identifiers; account deletion must not rewrite history.
create index operator_role_audit_subject_time_idx on public.operator_role_audit_events(subject_user_id,occurred_at desc,id desc);
alter table public.operator_role_audit_events enable row level security;
revoke all on public.operator_role_audit_events from public,anon,authenticated,service_role;
grant select on public.operator_role_audit_events to service_role;
create trigger operator_role_audit_append_only before update or delete or truncate on public.operator_role_audit_events
for each statement execute function public.wrs_reject_audit_mutation();

create or replace function public.wrs_admin_role_subject(p_operator_user_id uuid,p_identifier text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_identifier text := trim(p_identifier); v_subject public.user_profiles%rowtype; v_roles jsonb;
begin
  if not public.wrs_operator_has_permission(p_operator_user_id,'operations.roles') then
    raise exception 'operator permission denied';
  end if;
  if v_identifier is null or char_length(v_identifier)>320 then raise exception 'exact account identifier is required'; end if;
  if v_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into v_subject from public.user_profiles where user_id=v_identifier::uuid and status<>'deleted';
  elsif v_identifier ~ '^[^[:space:]@*%]+@[^[:space:]@*%]+\.[^[:space:]@*%]+$' then
    select * into v_subject from public.user_profiles where normalized_email = lower(v_identifier) and status<>'deleted';
  else raise exception 'exact account identifier is required'; end if;
  if v_subject.user_id is null then return null; end if;
  select coalesce(jsonb_agg(r.slug order by r.slug),'[]'::jsonb) into v_roles
  from public.user_roles ur join public.roles r on r.id=ur.role_id
  where ur.user_id=v_subject.user_id and r.slug in ('support_operator','kyc_operator','finance_operator','data_operator','deployment_operator','risk_operator','reward_operator');
  return jsonb_build_object('userId',v_subject.user_id,'identifier',v_subject.normalized_email,'roles',v_roles);
end;
$$;

create or replace function public.wrs_admin_set_operator_role(
  p_operator_user_id uuid,p_subject_user_id uuid,p_role_slug text,p_enabled boolean,p_reason text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_role_id uuid; v_changed boolean; v_audit_id bigint; v_count integer;
begin
  -- Conflicts with all concurrent role writers, including bootstrap and trusted direct writes.
  lock table public.user_roles in share row exclusive mode;
  if not public.wrs_operator_has_permission(p_operator_user_id,'operations.roles') or not exists(
    select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
    join public.user_profiles up on up.user_id=ur.user_id where ur.user_id=p_operator_user_id and r.slug='admin' and up.status='active'
  ) then raise exception 'operator permission denied'; end if;
  if p_operator_user_id = p_subject_user_id then raise exception 'self role changes are forbidden'; end if;
  if p_enabled is null then raise exception 'role decision is required'; end if;
  if p_reason is null or char_length(trim(p_reason)) not between 3 and 1000 then raise exception 'operator reason is required'; end if;
  if p_role_slug = 'admin' then
    if not p_enabled and exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=p_subject_user_id and r.slug='admin') then
      select count(*) into v_count from public.user_roles ur join public.roles r on r.id=ur.role_id
        join public.user_profiles up on up.user_id=ur.user_id where r.slug='admin' and up.status='active';
      if v_count<=1 then raise exception 'cannot remove the last active administrator'; end if;
    end if;
    raise exception 'full admin role changes require the trusted project-owner procedure';
  end if;
  if p_role_slug is null or p_role_slug not in ('support_operator','kyc_operator','finance_operator','data_operator','deployment_operator','risk_operator','reward_operator') then
    raise exception 'unsupported operator role';
  end if;
  if not exists(select 1 from public.user_profiles up join auth.users au on au.id=up.user_id where up.user_id=p_subject_user_id and up.status<>'deleted') then
    raise exception 'target account does not exist';
  end if;
  select id into v_role_id from public.roles where slug=p_role_slug;
  if v_role_id is null then raise exception 'unsupported operator role'; end if;
  if p_enabled then
    insert into public.user_roles(user_id,role_id,granted_by) values(p_subject_user_id,v_role_id,p_operator_user_id)
      on conflict(user_id,role_id) do nothing;
  else
    delete from public.user_roles where user_id=p_subject_user_id and role_id=v_role_id;
  end if;
  v_changed := found;
  if v_changed then
    insert into public.operator_role_audit_events(subject_user_id,role_slug,operator_user_id,actor_type,actor_reference,action,reason)
    values(p_subject_user_id,p_role_slug,p_operator_user_id,'admin',p_operator_user_id::text,
      case when p_enabled then 'role.grant' else 'role.revoke' end,trim(p_reason)) returning id into v_audit_id;
  end if;
  return jsonb_build_object('userId',p_subject_user_id,'role',p_role_slug,'enabled',p_enabled,'changed',v_changed,'auditId',v_audit_id);
end;
$$;

create or replace function public.wrs_bootstrap_initial_admin(p_subject_user_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_role_id uuid; v_audit_id bigint;
begin
  lock table public.user_roles in share row exclusive mode;
  if exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where r.slug='admin') then
    raise exception 'an administrator already exists';
  end if;
  if exists(select 1 from public.operator_role_audit_events where action='role.bootstrap') then
    raise exception 'initial administrator bootstrap was already completed';
  end if;
  if p_reason is null or char_length(trim(p_reason)) not between 3 and 1000 then raise exception 'operator reason is required'; end if;
  if not exists(select 1 from public.user_profiles up join auth.users au on au.id=up.user_id where up.user_id=p_subject_user_id and up.status='active') then
    raise exception 'target account does not exist or is not active';
  end if;
  select id into v_role_id from public.roles where slug='admin';
  if v_role_id is null then raise exception 'admin role is unavailable'; end if;
  insert into public.user_roles(user_id,role_id,granted_by) values(p_subject_user_id,v_role_id,null);
  insert into public.operator_role_audit_events(subject_user_id,role_slug,operator_user_id,actor_type,actor_reference,action,reason)
  values(p_subject_user_id,'admin',null,'bootstrap','service_role:initial-admin','role.bootstrap',trim(p_reason)) returning id into v_audit_id;
  return jsonb_build_object('userId',p_subject_user_id,'role','admin','auditId',v_audit_id);
end;
$$;

revoke all on function public.wrs_operator_has_permission(uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_admin_role_subject(uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_admin_set_operator_role(uuid,uuid,text,boolean,text) from public,anon,authenticated;
revoke all on function public.wrs_bootstrap_initial_admin(uuid,text) from public,anon,authenticated;
grant execute on function public.wrs_operator_has_permission(uuid,text) to service_role;
grant execute on function public.wrs_admin_role_subject(uuid,text) to service_role;
grant execute on function public.wrs_admin_set_operator_role(uuid,uuid,text,boolean,text) to service_role;
grant execute on function public.wrs_bootstrap_initial_admin(uuid,text) to service_role;
