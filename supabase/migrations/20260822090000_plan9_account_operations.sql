-- WRS Plan 9: authoritative profile/settings, durable account deletion,
-- support + knowledge base, and least-privilege audited staff operations.

alter table public.user_profiles
  add column if not exists country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$');

create table if not exists public.user_settings (
  user_id uuid primary key references public.user_profiles(user_id) on delete restrict,
  language text not null default 'en' check (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'UTC',
  notifications_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  biometric_login_enabled boolean not null default false,
  safety_notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  status text not null default 'requested' check (status in ('requested','processing','completed','cancelled','failed')),
  reason text,
  eligible_at timestamptz not null default (now()+interval '24 hours'),
  claimed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count between 0 and 8),
  last_error text,
  provider_redacted_at timestamptz,
  anonymized_at timestamptz,
  audit_summary jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index if not exists account_deletion_one_open_idx
  on public.account_deletion_requests(user_id)
  where status in ('requested','processing','failed');
create index if not exists account_deletion_due_idx
  on public.account_deletion_requests(status,eligible_at,requested_at)
  where status in ('requested','failed');

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  category text not null check (category in ('account','billing','wallet','deployment','data','training','fraud','technical','other')),
  subject text not null check (char_length(trim(subject)) between 4 and 160),
  status text not null default 'open' check (status in ('open','in_progress','waiting_user','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_operator_id uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists support_tickets_user_time_idx on public.support_tickets(user_id,created_at desc);
create index if not exists support_tickets_queue_idx on public.support_tickets(status,priority,created_at);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete restrict,
  author_user_id uuid references public.user_profiles(user_id) on delete set null,
  author_role text not null check (author_role in ('user','operator','system')),
  body text not null check (char_length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_time_idx on public.support_messages(ticket_id,created_at,id);

create table if not exists public.support_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete restrict,
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  storage_bucket text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  scan_status text not null default 'pending' check (scan_status in ('pending','clean','rejected','error')),
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_base_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  body text not null,
  category text not null,
  status text not null default 'draft' check (status in ('draft','published','retired')),
  search_terms text[] not null default '{}',
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_base_published_idx on public.knowledge_base_articles(status,category,published_at desc);

create table if not exists public.operations_audit_events (
  id bigint generated always as identity primary key,
  operator_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  permission_slug text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists operations_audit_operator_time_idx on public.operations_audit_events(operator_user_id,occurred_at desc,id desc);
create index if not exists operations_audit_target_idx on public.operations_audit_events(target_type,target_id,occurred_at desc);

insert into public.roles(slug,description) values
  ('support_operator','Support case operations'),
  ('kyc_operator','Identity verification operations'),
  ('finance_operator','Payments, withdrawals and reconciliation operations'),
  ('data_operator','Data review and privacy operations'),
  ('deployment_operator','Deployment operations'),
  ('risk_operator','Fraud, referrals, rewards and moderation operations')
on conflict(slug) do update set description=excluded.description;

insert into public.permissions(slug,description) values
  ('operations.read','Read redacted production operations state'),
  ('operations.support','Manage support cases'),
  ('operations.kyc','Review identity verification state'),
  ('operations.finance','Review finance and payout state'),
  ('operations.data','Review data/privacy state'),
  ('operations.deployment','Review deployment state'),
  ('operations.risk','Review fraud/referral/reward/moderation state'),
  ('operations.security','Suspend/restore accounts and execute security-sensitive operations')
on conflict(slug) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where (r.slug='support_operator' and p.slug in ('operations.read','operations.support'))
   or (r.slug='kyc_operator' and p.slug in ('operations.read','operations.kyc'))
   or (r.slug='finance_operator' and p.slug in ('operations.read','operations.finance'))
   or (r.slug='data_operator' and p.slug in ('operations.read','operations.data'))
   or (r.slug='deployment_operator' and p.slug in ('operations.read','operations.deployment'))
   or (r.slug='risk_operator' and p.slug in ('operations.read','operations.risk'))
   or (r.slug='admin')
on conflict do nothing;

insert into public.knowledge_base_articles(slug,title,summary,body,category,status,search_terms,published_at) values
  ('deployment-revenue','How deployment revenue is calculated','Verified work settles through the WRS ledger.','Deployment rates are snapshotted in accepted contracts. Only internally verified completed work is eligible for settlement. Browser-entered hours or earnings cannot credit a wallet.','deployment','published',array['deployment','revenue','contract','wallet'],now()),
  ('data-rejections','Why a data submission gets rejected','Quality, consent and scan requirements for contributed data.','A submission can be rejected when consent is absent or withdrawn, the private asset is not clean-scanned, policy checks fail, or reviewer quality evidence does not meet the task threshold.','data','published',array['data','rejected','quality','consent'],now()),
  ('mfa-setup','Setting up two-factor authentication','Protect high-risk account and operator actions.','Two-factor authentication is enrolled from Security settings. Sensitive identity changes, account deletion and high-risk staff actions require a recent MFA step-up.','security','published',array['mfa','2fa','security','authentication'],now()),
  ('points-boosts','Understanding XP, points and boosts','Progression units are separate from cash.','XP and reward points are progression systems, not withdrawable money. Boost activation spends append-only reward points and has an explicit server expiry/effect projection.','rewards','published',array['xp','points','boosts','rewards'],now())
on conflict(slug) do update set title=excluded.title,summary=excluded.summary,body=excluded.body,category=excluded.category,status='published',search_terms=excluded.search_terms,published_at=coalesce(public.knowledge_base_articles.published_at,now()),updated_at=now();

alter table public.user_settings enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_attachments enable row level security;
alter table public.knowledge_base_articles enable row level security;
alter table public.operations_audit_events enable row level security;

revoke all on public.user_settings,public.account_deletion_requests,public.support_tickets,public.support_messages,
  public.support_attachments,public.knowledge_base_articles,public.operations_audit_events from anon,authenticated;

create or replace function public.wrs_operations_append_only()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'operations audit evidence is append-only';
end;
$$;
drop trigger if exists operations_audit_events_append_only on public.operations_audit_events;
create trigger operations_audit_events_append_only before update or delete on public.operations_audit_events
for each row execute function public.wrs_operations_append_only();

create or replace function public.wrs_recent_mfa_session(p_user_id uuid,p_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.user_sessions s
    where s.user_id=p_user_id and s.auth_session_id=p_session_id and s.revoked_at is null
      and s.expires_at>now() and s.mfa_satisfied_at>=now()-interval '10 minutes'
  )
$$;

create or replace function public.wrs_update_profile(
  p_user_id uuid,p_session_id uuid,p_full_name text,p_country_code text,p_email text,p_phone text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_profile public.user_profiles%rowtype;
  v_email text:=lower(trim(p_email));
  v_phone text:=trim(p_phone);
  v_sensitive boolean:=false;
begin
  select * into v_profile from public.user_profiles where user_id=p_user_id for update;
  if v_profile.user_id is null or v_profile.status not in ('pending','active') then raise exception 'active profile required'; end if;
  if char_length(trim(p_full_name))<2 or char_length(trim(p_full_name))>120 then raise exception 'invalid profile name'; end if;
  if p_country_code is not null and upper(p_country_code)!~'^[A-Z]{2}$' then raise exception 'invalid country'; end if;
  if v_email!~'^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'invalid email'; end if;
  if v_phone!~'^[+][1-9][0-9]{7,14}$' then raise exception 'invalid phone'; end if;
  v_sensitive:=v_email<>v_profile.normalized_email or v_phone<>v_profile.normalized_phone;
  if v_sensitive and not public.wrs_recent_mfa_session(p_user_id,p_session_id) then raise exception 'recent MFA is required'; end if;

  update public.user_profiles set
    full_name=trim(p_full_name),
    country_code=case when p_country_code is null then null else upper(p_country_code) end,
    normalized_email=v_email,
    normalized_phone=v_phone,
    email_verified_at=case when v_email<>v_profile.normalized_email then null else email_verified_at end,
    phone_verified_at=case when v_phone<>v_profile.normalized_phone then null else phone_verified_at end,
    updated_at=now()
  where user_id=p_user_id;

  insert into public.security_events(user_id,event_type,metadata)
  values(p_user_id,case when v_sensitive then 'profile.identity-change-requested' else 'profile.updated' end,
    jsonb_build_object('country',p_country_code,'emailChanged',v_email<>v_profile.normalized_email,'phoneChanged',v_phone<>v_profile.normalized_phone));
  return jsonb_build_object('userId',p_user_id,'fullName',trim(p_full_name),'countryCode',p_country_code,
    'email',v_email,'phone',v_phone,'emailVerified',case when v_email<>v_profile.normalized_email then false else v_profile.email_verified_at is not null end,
    'phoneVerified',case when v_phone<>v_profile.normalized_phone then false else v_profile.phone_verified_at is not null end);
end;
$$;

create or replace function public.wrs_update_user_settings(
  p_user_id uuid,p_language text,p_currency text,p_timezone text,p_notifications boolean,p_marketing boolean,
  p_biometric boolean,p_safety boolean
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.user_settings%rowtype;
begin
  if p_language!~'^[a-z]{2}(-[A-Z]{2})?$' then raise exception 'invalid language'; end if;
  if upper(p_currency)!~'^[A-Z]{3}$' then raise exception 'invalid currency'; end if;
  if nullif(trim(p_timezone),'') is null or char_length(trim(p_timezone))>100 then raise exception 'invalid timezone'; end if;
  if not exists(select 1 from public.user_profiles where user_id=p_user_id and status in ('pending','active')) then raise exception 'active profile required'; end if;
  insert into public.user_settings(user_id,language,currency,timezone,notifications_enabled,marketing_enabled,biometric_login_enabled,safety_notifications_enabled)
  values(p_user_id,p_language,upper(p_currency),trim(p_timezone),p_notifications,p_marketing,p_biometric,p_safety)
  on conflict(user_id) do update set
    language=excluded.language,currency=excluded.currency,timezone=excluded.timezone,
    notifications_enabled=excluded.notifications_enabled,marketing_enabled=excluded.marketing_enabled,
    biometric_login_enabled=excluded.biometric_login_enabled,safety_notifications_enabled=excluded.safety_notifications_enabled,updated_at=now()
  returning * into v_row;
  return to_jsonb(v_row)-'user_id';
end;
$$;

create or replace function public.wrs_request_account_deletion(
  p_user_id uuid,p_session_id uuid,p_reason text default null
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.account_deletion_requests%rowtype; v_data_request uuid;
begin
  if not public.wrs_recent_mfa_session(p_user_id,p_session_id) then raise exception 'recent MFA is required'; end if;
  select * into v_request from public.account_deletion_requests
    where user_id=p_user_id and status in ('requested','processing','failed') order by requested_at desc limit 1;
  if v_request.id is null then
    insert into public.account_deletion_requests(user_id,reason,eligible_at)
    values(p_user_id,left(trim(coalesce(p_reason,'')),1000),now()+interval '24 hours') returning * into v_request;
  end if;
  v_data_request:=public.wrs_request_data_deletion(p_user_id,null,'account-deletion:'||v_request.id);
  update public.user_sessions set revoked_at=coalesce(revoked_at,now()) where user_id=p_user_id and revoked_at is null;
  insert into public.security_events(user_id,event_type,metadata)
  values(p_user_id,'account.deletion-requested',jsonb_build_object('requestId',v_request.id,'dataDeletionRequestId',v_data_request));
  return jsonb_build_object('requestId',v_request.id,'status',v_request.status,'eligibleAt',v_request.eligible_at,'dataDeletionRequestId',v_data_request);
end;
$$;

create or replace function public.wrs_cancel_account_deletion(
  p_user_id uuid,p_session_id uuid,p_request_id uuid
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.wrs_recent_mfa_session(p_user_id,p_session_id) then raise exception 'recent MFA is required'; end if;
  update public.account_deletion_requests set status='cancelled',completed_at=now()
  where id=p_request_id and user_id=p_user_id and status in ('requested','failed') and claimed_at is null;
  if not found then raise exception 'cancellable deletion request not found'; end if;
  insert into public.security_events(user_id,event_type,metadata)
  values(p_user_id,'account.deletion-cancelled',jsonb_build_object('requestId',p_request_id));
end;
$$;

create or replace function public.wrs_claim_next_account_deletion()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.account_deletion_requests%rowtype;
begin
  select * into v_request from public.account_deletion_requests r
  where r.status in ('requested','failed') and r.eligible_at<=now() and r.attempt_count<8
    and not exists(select 1 from public.data_deletion_requests d where d.user_id=r.user_id and d.asset_id is null and d.status in ('requested','processing','failed'))
    and not exists(select 1 from public.data_assets a where a.user_id=r.user_id and a.status<>'deleted')
  order by r.requested_at,r.id for update skip locked limit 1;
  if v_request.id is null then return null; end if;
  update public.account_deletion_requests set status='processing',claimed_at=now(),attempt_count=attempt_count+1,last_error=null where id=v_request.id;
  return jsonb_build_object('requestId',v_request.id,'userId',v_request.user_id,'attempt',v_request.attempt_count+1);
end;
$$;

create or replace function public.wrs_finalize_account_deletion(
  p_request_id uuid,p_provider_redacted boolean,p_audit_summary jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path='' as $$
declare v_request public.account_deletion_requests%rowtype; v_phone text; v_email text;
begin
  select * into v_request from public.account_deletion_requests where id=p_request_id for update;
  if v_request.id is null or v_request.status<>'processing' then raise exception 'claimed account deletion request not found'; end if;
  if not p_provider_redacted then raise exception 'identity provider redaction required'; end if;
  if exists(select 1 from public.data_assets where user_id=v_request.user_id and status<>'deleted') then raise exception 'private data deletion is incomplete'; end if;
  if exists(select 1 from public.data_deletion_requests where user_id=v_request.user_id and asset_id is null and status<>'completed') then raise exception 'private data deletion request is incomplete'; end if;

  v_email:='deleted+'||replace(v_request.user_id::text,'-','')||'@invalid.wrs';
  v_phone:='+999'||lpad((abs(hashtextextended(v_request.user_id::text,0))%100000000000)::text,11,'0');
  update public.user_profiles set full_name='Deleted User',normalized_email=v_email,normalized_phone=v_phone,
    country_code=null,status='deleted',email_verified_at=null,phone_verified_at=null,kyc_status='unverified',updated_at=now()
  where user_id=v_request.user_id;
  update public.user_settings set marketing_enabled=false,notifications_enabled=false,biometric_login_enabled=false,safety_notifications_enabled=false,updated_at=now()
  where user_id=v_request.user_id;
  update public.user_sessions set revoked_at=coalesce(revoked_at,now()) where user_id=v_request.user_id;
  update public.account_deletion_requests set status='completed',provider_redacted_at=now(),anonymized_at=now(),completed_at=now(),
    audit_summary=coalesce(p_audit_summary,'{}'::jsonb),last_error=null where id=v_request.id;
  insert into public.security_events(user_id,event_type,metadata)
  values(v_request.user_id,'account.deleted',jsonb_build_object('requestId',v_request.id,'anonymized',true));
end;
$$;

create or replace function public.wrs_fail_account_deletion(p_request_id uuid,p_error text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.account_deletion_requests set status='failed',claimed_at=null,eligible_at=now()+interval '1 hour',last_error=left(coalesce(p_error,'worker failure'),500)
  where id=p_request_id and status='processing';
  if not found then raise exception 'claimed account deletion request not found'; end if;
end;
$$;

create or replace function public.wrs_create_support_ticket(
  p_user_id uuid,p_category text,p_subject text,p_message text
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_ticket uuid;
begin
  if p_category not in ('account','billing','wallet','deployment','data','training','fraud','technical','other') then raise exception 'invalid support category'; end if;
  if char_length(trim(p_subject)) not between 4 and 160 or char_length(trim(p_message)) not between 1 and 10000 then raise exception 'invalid support ticket content'; end if;
  insert into public.support_tickets(user_id,category,subject) values(p_user_id,p_category,trim(p_subject)) returning id into v_ticket;
  insert into public.support_messages(ticket_id,author_user_id,author_role,body) values(v_ticket,p_user_id,'user',trim(p_message));
  return v_ticket;
end;
$$;

create or replace function public.wrs_add_support_message(p_user_id uuid,p_ticket_id uuid,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.support_tickets where id=p_ticket_id and user_id=p_user_id and status not in ('closed')) then raise exception 'support ticket not found'; end if;
  if char_length(trim(p_message)) not between 1 and 10000 then raise exception 'invalid support message'; end if;
  insert into public.support_messages(ticket_id,author_user_id,author_role,body) values(p_ticket_id,p_user_id,'user',trim(p_message)) returning id into v_id;
  update public.support_tickets set status=case when status='waiting_user' then 'in_progress' else status end,updated_at=now() where id=p_ticket_id;
  return v_id;
end;
$$;

create or replace function public.wrs_staff_update_support_ticket(
  p_operator_user_id uuid,p_ticket_id uuid,p_status text,p_priority text,p_message text,p_reason text
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.wrs_operator_has_permission(p_operator_user_id,'operations.support') then raise exception 'operator permission denied'; end if;
  if p_status not in ('open','in_progress','waiting_user','resolved','closed') or p_priority not in ('low','normal','high','urgent') then raise exception 'invalid support state'; end if;
  update public.support_tickets set status=p_status,priority=p_priority,assigned_operator_id=p_operator_user_id,updated_at=now(),
    resolved_at=case when p_status in ('resolved','closed') then coalesce(resolved_at,now()) else null end where id=p_ticket_id;
  if not found then raise exception 'support ticket not found'; end if;
  if nullif(trim(coalesce(p_message,'')),'') is not null then
    insert into public.support_messages(ticket_id,author_user_id,author_role,body) values(p_ticket_id,p_operator_user_id,'operator',trim(p_message));
  end if;
  perform public.wrs_record_operations_action(p_operator_user_id,'operations.support','support.ticket',p_ticket_id::text,'support.update',p_reason,
    jsonb_build_object('status',p_status,'priority',p_priority));
end;
$$;

create or replace function public.wrs_operator_has_permission(p_user_id uuid,p_permission text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
    left join public.role_permissions rp on rp.role_id=r.id left join public.permissions p on p.id=rp.permission_id
    where ur.user_id=p_user_id and (r.slug='admin' or p.slug=p_permission)
  )
$$;

create or replace function public.wrs_record_operations_action(
  p_operator_user_id uuid,p_permission text,p_target_type text,p_target_id text,p_action text,p_reason text,p_metadata jsonb default '{}'::jsonb
)
returns bigint language plpgsql security definer set search_path='' as $$
declare v_id bigint;
begin
  if not public.wrs_operator_has_permission(p_operator_user_id,p_permission) then raise exception 'operator permission denied'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'operator reason is required'; end if;
  insert into public.operations_audit_events(operator_user_id,permission_slug,action,target_type,target_id,reason,metadata)
  values(p_operator_user_id,p_permission,p_action,p_target_type,p_target_id,trim(p_reason),coalesce(p_metadata,'{}'::jsonb)) returning id into v_id;
  return v_id;
end;
$$;

-- Function creation order above references operator helpers; PostgreSQL resolves
-- those calls at function execution time. Every routine is service-role only.
revoke all on function public.wrs_recent_mfa_session(uuid,uuid) from public,anon,authenticated;
revoke all on function public.wrs_update_profile(uuid,uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.wrs_update_user_settings(uuid,text,text,text,boolean,boolean,boolean,boolean) from public,anon,authenticated;
revoke all on function public.wrs_request_account_deletion(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_cancel_account_deletion(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.wrs_claim_next_account_deletion() from public,anon,authenticated;
revoke all on function public.wrs_finalize_account_deletion(uuid,boolean,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_fail_account_deletion(uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_create_support_ticket(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.wrs_add_support_message(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_staff_update_support_ticket(uuid,uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.wrs_operator_has_permission(uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_record_operations_action(uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;

grant execute on function public.wrs_recent_mfa_session(uuid,uuid) to service_role;
grant execute on function public.wrs_update_profile(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.wrs_update_user_settings(uuid,text,text,text,boolean,boolean,boolean,boolean) to service_role;
grant execute on function public.wrs_request_account_deletion(uuid,uuid,text) to service_role;
grant execute on function public.wrs_cancel_account_deletion(uuid,uuid,uuid) to service_role;
grant execute on function public.wrs_claim_next_account_deletion() to service_role;
grant execute on function public.wrs_finalize_account_deletion(uuid,boolean,jsonb) to service_role;
grant execute on function public.wrs_fail_account_deletion(uuid,text) to service_role;
grant execute on function public.wrs_create_support_ticket(uuid,text,text,text) to service_role;
grant execute on function public.wrs_add_support_message(uuid,uuid,text) to service_role;
grant execute on function public.wrs_staff_update_support_ticket(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.wrs_operator_has_permission(uuid,text) to service_role;
grant execute on function public.wrs_record_operations_action(uuid,text,text,text,text,text,jsonb) to service_role;
