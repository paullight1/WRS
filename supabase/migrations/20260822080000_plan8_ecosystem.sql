-- WRS Plan 8: authoritative marketplace, rewards, academy, community and referral ecosystem.
-- Money remains in the Plan 5 double-entry ledger; reward points use a separate append-only event ledger.

create table if not exists public.marketplace_publishers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  name text not null,
  status text not null default 'active' check (status in ('active','suspended','retired')),
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.marketplace_publishers(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,95}$'),
  name text not null,
  description text not null default '',
  item_type text not null check (item_type in ('skill','language','module')),
  min_package_slug text not null default 'starter' check (min_package_slug in ('starter','builder','professional','enterprise','elite','visionary')),
  status text not null default 'draft' check (status in ('draft','published','suspended','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.marketplace_items(id) on delete restrict,
  version text not null check (char_length(version) between 1 and 32),
  price_minor bigint not null default 0 check (price_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  skill_slug text,
  capability_slug text,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected')),
  manifest jsonb not null default '{}'::jsonb check (jsonb_typeof(manifest)='object'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(item_id,version)
);
create index if not exists marketplace_versions_item_published_idx
  on public.marketplace_versions(item_id,published_at desc,created_at desc);

create table if not exists public.marketplace_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  robot_id uuid not null references public.robots(id) on delete restrict,
  version_id uuid not null references public.marketplace_versions(id) on delete restrict,
  status text not null default 'active' check (status in ('active','revoked','refunded','expired')),
  source text not null check (source in ('free','wallet','admin')),
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  acquisition_idempotency_key text not null unique,
  acquired_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id,robot_id,version_id)
);

create table if not exists public.marketplace_installs (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null unique references public.marketplace_entitlements(id) on delete restrict,
  robot_id uuid not null references public.robots(id) on delete restrict,
  version_id uuid not null references public.marketplace_versions(id) on delete restrict,
  status text not null default 'installed' check (status in ('installed','removed')),
  installed_at timestamptz not null default now(),
  removed_at timestamptz
);

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  item_id uuid not null references public.marketplace_items(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  review_text text not null default '' check (char_length(review_text) <= 3000),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,item_id)
);

create table if not exists public.reward_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  robot_id uuid references public.robots(id) on delete restrict,
  amount integer not null check (amount <> 0),
  source text not null check (source in ('event-code','boost','academy','community','referral','marketplace','admin-adjustment')),
  reference_type text not null,
  reference_id text not null,
  idempotency_key text not null unique,
  reversal_of uuid unique references public.reward_point_events(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (reversal_of is null or amount < 0)
);
create index if not exists reward_point_events_user_time_idx
  on public.reward_point_events(user_id,created_at,id);
create unique index if not exists reward_point_events_source_reference_idx
  on public.reward_point_events(user_id,source,reference_type,reference_id)
  where reversal_of is null;

create table if not exists public.reward_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  require_verified_account boolean not null default true,
  status text not null default 'draft' check (status in ('draft','active','closed','cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.event_reward_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.reward_events(id) on delete restrict,
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  reward_points integer not null check (reward_points > 0),
  expires_at timestamptz not null,
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  created_at timestamptz not null default now(),
  check (redemption_count <= max_redemptions)
);

create table if not exists public.event_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.reward_events(id) on delete restrict,
  code_id uuid not null references public.event_reward_codes(id) on delete restrict,
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  reward_event_id uuid not null unique references public.reward_point_events(id) on delete restrict,
  redeemed_at timestamptz not null default now(),
  unique(event_id,user_id)
);

create table if not exists public.reward_boost_catalog (
  slug text primary key,
  name text not null,
  cost_points integer not null check (cost_points > 0),
  duration_seconds integer not null check (duration_seconds > 0),
  effect jsonb not null default '{}'::jsonb check (jsonb_typeof(effect)='object'),
  min_package_slug text not null default 'starter' check (min_package_slug in ('starter','builder','professional','enterprise','elite','visionary')),
  status text not null default 'active' check (status in ('active','retired')),
  created_at timestamptz not null default now()
);

create table if not exists public.reward_boost_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  robot_id uuid not null references public.robots(id) on delete restrict,
  boost_slug text not null references public.reward_boost_catalog(slug) on delete restrict,
  cost_event_id uuid not null unique references public.reward_point_events(id) on delete restrict,
  idempotency_key text not null unique,
  effect_snapshot jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  check (expires_at > starts_at)
);

create table if not exists public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  pass_score numeric(5,2) not null default 80 check (pass_score between 0 and 100),
  status text not null default 'draft' check (status in ('draft','published','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academy_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  slug text not null,
  title text not null,
  position integer not null check (position > 0),
  status text not null default 'published' check (status in ('published','retired')),
  unique(course_id,slug),
  unique(course_id,position)
);

create table if not exists public.academy_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  course_id uuid not null references public.academy_courses(id) on delete restrict,
  status text not null default 'active' check (status in ('active','completed','withdrawn')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id,course_id)
);

create table if not exists public.academy_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.academy_enrollments(id) on delete cascade,
  module_id uuid not null references public.academy_modules(id) on delete restrict,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(enrollment_id,module_id)
);

create table if not exists public.academy_assessments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.academy_enrollments(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  score numeric(5,2) not null check (score between 0 and 100),
  status text not null check (status in ('passed','failed')),
  evidence jsonb not null default '{}'::jsonb,
  assessor_reference text not null,
  assessed_at timestamptz not null default now(),
  unique(enrollment_id,attempt)
);

create table if not exists public.academy_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  course_id uuid not null references public.academy_courses(id) on delete restrict,
  enrollment_id uuid not null unique references public.academy_enrollments(id) on delete restrict,
  assessment_id uuid not null unique references public.academy_assessments(id) on delete restrict,
  public_verification_id uuid not null default gen_random_uuid() unique,
  status text not null default 'active' check (status in ('active','revoked')),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id,course_id)
);

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'draft' check (status in ('draft','published','closed','cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.community_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.community_events(id) on delete restrict,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  status text not null default 'joined' check (status in ('joined','attended','cancelled')),
  reminder_enabled boolean not null default false,
  joined_at timestamptz not null default now(),
  attended_at timestamptz,
  attendance_reference text,
  unique(event_id,user_id)
);

create table if not exists public.community_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  status text not null default 'published' check (status in ('draft','published','retired')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.community_leaderboard_profiles (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  opted_in boolean not null default false,
  display_alias text not null check (char_length(trim(display_alias)) between 2 and 40),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  action text not null,
  reason text not null,
  operator_reference text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_profiles (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{8,24}$'),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);

create table if not exists public.referral_reward_policies (
  slug text primary key,
  referrer_points integer not null check (referrer_points >= 0),
  referred_points integer not null check (referred_points >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.referral_relationships (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  referred_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending','qualified','rejected')),
  eligible_at timestamptz,
  qualified_at timestamptz,
  referrer_reward_event_id uuid unique references public.reward_point_events(id) on delete restrict,
  referred_reward_event_id uuid unique references public.reward_point_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(referred_user_id),
  check (referrer_user_id <> referred_user_id)
);
create index if not exists referral_relationships_referrer_idx
  on public.referral_relationships(referrer_user_id,created_at desc);

insert into public.referral_reward_policies(slug,referrer_points,referred_points,active)
values('default',250,100,true)
on conflict(slug) do update set referrer_points=excluded.referrer_points,referred_points=excluded.referred_points,active=true,updated_at=now();

insert into public.reward_boost_catalog(slug,name,cost_points,duration_seconds,effect,min_package_slug,status) values
  ('quality-focus','Quality Focus',150,86400,jsonb_build_object('qualityReviewPriority',1),'starter','active'),
  ('training-focus','Training Focus',200,86400,jsonb_build_object('trainingXpMultiplier',1.10),'builder','active')
on conflict(slug) do update set name=excluded.name,cost_points=excluded.cost_points,duration_seconds=excluded.duration_seconds,
  effect=excluded.effect,min_package_slug=excluded.min_package_slug,status=excluded.status;

alter table public.marketplace_publishers enable row level security;
alter table public.marketplace_items enable row level security;
alter table public.marketplace_versions enable row level security;
alter table public.marketplace_entitlements enable row level security;
alter table public.marketplace_installs enable row level security;
alter table public.marketplace_reviews enable row level security;
alter table public.reward_point_events enable row level security;
alter table public.reward_events enable row level security;
alter table public.event_reward_codes enable row level security;
alter table public.event_reward_redemptions enable row level security;
alter table public.reward_boost_catalog enable row level security;
alter table public.reward_boost_activations enable row level security;
alter table public.academy_courses enable row level security;
alter table public.academy_modules enable row level security;
alter table public.academy_enrollments enable row level security;
alter table public.academy_progress enable row level security;
alter table public.academy_assessments enable row level security;
alter table public.academy_certificates enable row level security;
alter table public.community_events enable row level security;
alter table public.community_event_participants enable row level security;
alter table public.community_announcements enable row level security;
alter table public.community_leaderboard_profiles enable row level security;
alter table public.community_moderation_actions enable row level security;
alter table public.referral_profiles enable row level security;
alter table public.referral_reward_policies enable row level security;
alter table public.referral_relationships enable row level security;

revoke all on public.marketplace_entitlements,public.marketplace_installs,public.reward_point_events,
  public.event_reward_codes,public.event_reward_redemptions,public.reward_boost_activations,
  public.academy_enrollments,public.academy_progress,public.academy_assessments,public.academy_certificates,
  public.community_event_participants,public.community_moderation_actions,public.referral_relationships
  from anon,authenticated;

create policy marketplace_items_public_read on public.marketplace_items for select to authenticated using (status='published');
create policy marketplace_versions_public_read on public.marketplace_versions for select to authenticated using (verification_status='approved' and published_at is not null);
create policy marketplace_reviews_public_read on public.marketplace_reviews for select to authenticated using (status='published');
create policy reward_boost_catalog_read on public.reward_boost_catalog for select to authenticated using (status='active');
create policy academy_courses_read on public.academy_courses for select to authenticated using (status='published');
create policy academy_modules_read on public.academy_modules for select to authenticated using (status='published');
create policy community_events_read on public.community_events for select to authenticated using (status='published');
create policy community_announcements_read on public.community_announcements for select to authenticated using (status='published');

create or replace function public.wrs_ecosystem_append_only()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'ecosystem evidence is append-only';
end;
$$;

drop trigger if exists reward_point_events_append_only on public.reward_point_events;
create trigger reward_point_events_append_only before update or delete on public.reward_point_events
for each row execute function public.wrs_ecosystem_append_only();
drop trigger if exists event_reward_redemptions_append_only on public.event_reward_redemptions;
create trigger event_reward_redemptions_append_only before update or delete on public.event_reward_redemptions
for each row execute function public.wrs_ecosystem_append_only();
drop trigger if exists academy_assessments_append_only on public.academy_assessments;
create trigger academy_assessments_append_only before update or delete on public.academy_assessments
for each row execute function public.wrs_ecosystem_append_only();
drop trigger if exists community_moderation_actions_append_only on public.community_moderation_actions;
create trigger community_moderation_actions_append_only before update or delete on public.community_moderation_actions
for each row execute function public.wrs_ecosystem_append_only();

create or replace function public.wrs_reward_points_balance(p_user_id uuid)
returns bigint language sql stable security definer set search_path='' as $$
  select coalesce(sum(amount),0)::bigint from public.reward_point_events where user_id=p_user_id
$$;

create or replace function public.wrs_append_reward_point_event(
  p_user_id uuid,p_robot_id uuid,p_amount integer,p_source text,p_reference_type text,p_reference_id text,
  p_idempotency_key text,p_reversal_of uuid default null,p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_existing public.reward_point_events%rowtype; v_id uuid;
begin
  if p_amount=0 then raise exception 'reward point amount cannot be zero'; end if;
  if p_source not in ('event-code','boost','academy','community','referral','marketplace','admin-adjustment') then
    raise exception 'invalid reward point source';
  end if;
  select * into v_existing from public.reward_point_events where idempotency_key=p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.user_id<>p_user_id or v_existing.amount<>p_amount or v_existing.source<>p_source
       or v_existing.reference_type<>p_reference_type or v_existing.reference_id<>p_reference_id then
      raise exception 'reward idempotency payload conflict';
    end if;
    return v_existing.id;
  end if;
  insert into public.reward_point_events(user_id,robot_id,amount,source,reference_type,reference_id,idempotency_key,reversal_of,metadata)
  values(p_user_id,p_robot_id,p_amount,p_source,p_reference_type,p_reference_id,p_idempotency_key,p_reversal_of,coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_acquire_marketplace_item(
  p_user_id uuid,p_robot_id uuid,p_version_id uuid,p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_robot public.robots%rowtype;
  v_version public.marketplace_versions%rowtype;
  v_item public.marketplace_items%rowtype;
  v_ent public.marketplace_entitlements%rowtype;
  v_wallet jsonb;
  v_tx uuid;
  v_wallet_code text;
  v_revenue_code text;
  v_source text;
begin
  perform pg_advisory_xact_lock(hashtextextended('marketplace:'||p_user_id::text,0));
  select * into v_robot from public.robots where id=p_robot_id and owner_user_id=p_user_id and lifecycle='active' for update;
  if v_robot.id is null then raise exception 'owned active robot required'; end if;
  select * into v_version from public.marketplace_versions where id=p_version_id and verification_status='approved' and published_at is not null;
  if v_version.id is null then raise exception 'approved marketplace version required'; end if;
  select * into v_item from public.marketplace_items where id=v_version.item_id and status='published';
  if v_item.id is null then raise exception 'published marketplace item required'; end if;

  select * into v_ent from public.marketplace_entitlements where acquisition_idempotency_key=p_idempotency_key;
  if v_ent.id is not null then
    if v_ent.user_id<>p_user_id or v_ent.robot_id<>p_robot_id or v_ent.version_id<>p_version_id then
      raise exception 'marketplace idempotency payload conflict';
    end if;
    return jsonb_build_object('entitlementId',v_ent.id,'status',v_ent.status,'source',v_ent.source,'transactionId',v_ent.ledger_transaction_id);
  end if;
  select * into v_ent from public.marketplace_entitlements where user_id=p_user_id and robot_id=p_robot_id and version_id=p_version_id;
  if v_ent.id is not null then
    return jsonb_build_object('entitlementId',v_ent.id,'status',v_ent.status,'source',v_ent.source,'transactionId',v_ent.ledger_transaction_id);
  end if;

  if v_version.price_minor=0 then
    v_source:='free';
    v_tx:=null;
  else
    v_wallet:=public.wrs_wallet_snapshot(p_user_id,v_version.currency);
    if (v_wallet->>'availableMinor')::bigint < v_version.price_minor then raise exception 'insufficient wallet balance'; end if;
    v_wallet_code:='liability:wallet:'||p_user_id||':'||v_version.currency;
    v_revenue_code:='revenue:marketplace:'||v_version.currency;
    perform public.wrs_ensure_finance_account(p_user_id,v_wallet_code,'liability','credit',v_version.currency);
    perform public.wrs_ensure_finance_account(null,v_revenue_code,'revenue','credit',v_version.currency);
    v_tx:=public.wrs_post_ledger_transaction(
      p_user_id,'marketplace-purchase','marketplace:'||v_version.id||':'||p_user_id,
      'marketplace-purchase:'||p_user_id||':'||p_idempotency_key,null,null,
      jsonb_build_array(
        jsonb_build_object('accountCode',v_wallet_code,'direction','debit','amountMinor',v_version.price_minor,'currency',v_version.currency),
        jsonb_build_object('accountCode',v_revenue_code,'direction','credit','amountMinor',v_version.price_minor,'currency',v_version.currency)
      ),
      jsonb_build_object('marketplaceVersionId',v_version.id,'marketplaceItemId',v_item.id)
    );
    v_source:='wallet';
  end if;

  insert into public.marketplace_entitlements(user_id,robot_id,version_id,status,source,ledger_transaction_id,acquisition_idempotency_key)
  values(p_user_id,p_robot_id,p_version_id,'active',v_source,v_tx,p_idempotency_key)
  returning * into v_ent;
  return jsonb_build_object('entitlementId',v_ent.id,'status',v_ent.status,'source',v_ent.source,'transactionId',v_ent.ledger_transaction_id);
end;
$$;

create or replace function public.wrs_install_marketplace_item(
  p_user_id uuid,p_robot_id uuid,p_entitlement_id uuid
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_ent public.marketplace_entitlements%rowtype;
  v_version public.marketplace_versions%rowtype;
  v_item public.marketplace_items%rowtype;
  v_install public.marketplace_installs%rowtype;
begin
  select * into v_ent from public.marketplace_entitlements
    where id=p_entitlement_id and user_id=p_user_id and robot_id=p_robot_id and status='active' for update;
  if v_ent.id is null then raise exception 'active entitlement required'; end if;
  if not exists(select 1 from public.robots where id=p_robot_id and owner_user_id=p_user_id and lifecycle='active') then
    raise exception 'owned active robot required';
  end if;
  select * into v_version from public.marketplace_versions where id=v_ent.version_id and verification_status='approved';
  if v_version.id is null or v_version.skill_slug is null then raise exception 'approved installable marketplace skill required'; end if;
  select * into v_item from public.marketplace_items where id=v_version.item_id and status='published';
  if v_item.id is null then raise exception 'published marketplace item required'; end if;

  insert into public.marketplace_installs(entitlement_id,robot_id,version_id,status)
  values(v_ent.id,p_robot_id,v_version.id,'installed')
  on conflict(entitlement_id) do update set status='installed',removed_at=null,installed_at=now()
  returning * into v_install;

  insert into public.robot_skills(robot_id,skill_slug,name,version,verified,source_reference)
  values(p_robot_id,v_version.skill_slug,v_item.name,v_version.version,true,'marketplace:'||v_version.id)
  on conflict(robot_id,skill_slug,version) do update set verified=true,source_reference=excluded.source_reference;

  return jsonb_build_object('installId',v_install.id,'status',v_install.status,'skillSlug',v_version.skill_slug,'version',v_version.version);
end;
$$;

create or replace function public.wrs_review_marketplace_item(
  p_user_id uuid,p_item_id uuid,p_rating integer,p_review_text text
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_rating not between 1 and 5 then raise exception 'rating out of range'; end if;
  if not exists(
    select 1 from public.marketplace_entitlements e
    join public.marketplace_versions v on v.id=e.version_id
    where e.user_id=p_user_id and e.status='active' and v.item_id=p_item_id
  ) then raise exception 'active entitlement required to review'; end if;
  insert into public.marketplace_reviews(user_id,item_id,rating,review_text,status)
  values(p_user_id,p_item_id,p_rating,left(coalesce(p_review_text,''),3000),'published')
  on conflict(user_id,item_id) do update set rating=excluded.rating,review_text=excluded.review_text,status='published',updated_at=now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_create_event_reward_code(
  p_event_id uuid,p_code_hash text,p_reward_points integer,p_expires_at timestamptz,p_max_redemptions integer default 1
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_code_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid code hash'; end if;
  if p_reward_points<=0 or p_max_redemptions<=0 then raise exception 'invalid reward code policy'; end if;
  if not exists(select 1 from public.reward_events where id=p_event_id and status in ('draft','active')) then raise exception 'reward event not found'; end if;
  insert into public.event_reward_codes(event_id,code_hash,reward_points,expires_at,max_redemptions,status)
  values(p_event_id,p_code_hash,p_reward_points,p_expires_at,p_max_redemptions,'active') returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_redeem_event_code(p_user_id uuid,p_code_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_code public.event_reward_codes%rowtype;
  v_event public.reward_events%rowtype;
  v_reward uuid;
  v_redemption uuid;
begin
  select * into v_code from public.event_reward_codes where code_hash=p_code_hash for update;
  if v_code.id is null or v_code.status<>'active' then raise exception 'event code invalid'; end if;
  if v_code.expires_at<=now() then raise exception 'event code expired'; end if;
  select * into v_event from public.reward_events where id=v_code.event_id;
  if v_event.id is null or v_event.status<>'active' or now()<v_event.starts_at or now()>v_event.ends_at then raise exception 'reward event unavailable'; end if;
  if v_event.require_verified_account and not exists(
    select 1 from public.user_profiles where user_id=p_user_id and status='active' and email_verified_at is not null and phone_verified_at is not null
  ) then raise exception 'verified account required'; end if;
  if exists(select 1 from public.event_reward_redemptions where event_id=v_event.id and user_id=p_user_id) then
    return jsonb_build_object('status','already-redeemed');
  end if;
  if v_code.redemption_count>=v_code.max_redemptions then raise exception 'event code exhausted'; end if;

  v_reward:=public.wrs_append_reward_point_event(
    p_user_id,null,v_code.reward_points,'event-code','event',v_event.id::text,
    'event-code:'||v_event.id||':'||p_user_id,null,jsonb_build_object('codeId',v_code.id)
  );
  insert into public.event_reward_redemptions(event_id,code_id,user_id,reward_event_id)
  values(v_event.id,v_code.id,p_user_id,v_reward) returning id into v_redemption;
  update public.event_reward_codes set redemption_count=redemption_count+1 where id=v_code.id;
  return jsonb_build_object('status','redeemed','redemptionId',v_redemption,'points',v_code.reward_points,'balance',public.wrs_reward_points_balance(p_user_id));
end;
$$;

create or replace function public.wrs_activate_reward_boost(
  p_user_id uuid,p_robot_id uuid,p_boost_slug text,p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_boost public.reward_boost_catalog%rowtype;
  v_activation public.reward_boost_activations%rowtype;
  v_cost uuid;
  v_balance bigint;
  v_expires timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('reward:'||p_user_id::text,0));
  if not exists(select 1 from public.robots where id=p_robot_id and owner_user_id=p_user_id and lifecycle='active') then raise exception 'owned active robot required'; end if;
  select * into v_activation from public.reward_boost_activations where idempotency_key=p_idempotency_key;
  if v_activation.id is not null then
    if v_activation.user_id<>p_user_id or v_activation.robot_id<>p_robot_id or v_activation.boost_slug<>p_boost_slug then
      raise exception 'boost idempotency payload conflict';
    end if;
    return jsonb_build_object('activationId',v_activation.id,'status',v_activation.status,'expiresAt',v_activation.expires_at,'effect',v_activation.effect_snapshot);
  end if;
  select * into v_boost from public.reward_boost_catalog where slug=p_boost_slug and status='active';
  if v_boost.slug is null then raise exception 'boost unavailable'; end if;
  v_balance:=public.wrs_reward_points_balance(p_user_id);
  if v_balance<v_boost.cost_points then raise exception 'insufficient reward points'; end if;
  v_cost:=public.wrs_append_reward_point_event(
    p_user_id,p_robot_id,-v_boost.cost_points,'boost','boost',p_boost_slug,
    'boost-cost:'||p_user_id||':'||p_idempotency_key,null,jsonb_build_object('boostSlug',p_boost_slug)
  );
  v_expires:=now()+make_interval(secs=>v_boost.duration_seconds);
  insert into public.reward_boost_activations(user_id,robot_id,boost_slug,cost_event_id,idempotency_key,effect_snapshot,expires_at,status)
  values(p_user_id,p_robot_id,p_boost_slug,v_cost,p_idempotency_key,v_boost.effect,v_expires,'active') returning * into v_activation;
  return jsonb_build_object('activationId',v_activation.id,'status',v_activation.status,'expiresAt',v_activation.expires_at,'effect',v_activation.effect_snapshot,'balance',public.wrs_reward_points_balance(p_user_id));
end;
$$;

create or replace function public.wrs_enroll_academy_course(p_user_id uuid,p_course_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.academy_courses where id=p_course_id and status='published') then raise exception 'published course required'; end if;
  insert into public.academy_enrollments(user_id,course_id,status) values(p_user_id,p_course_id,'active')
  on conflict(user_id,course_id) do update set status=case when public.academy_enrollments.status='withdrawn' then 'active' else public.academy_enrollments.status end
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_record_academy_progress(
  p_user_id uuid,p_enrollment_id uuid,p_module_id uuid,p_progress_percent integer
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_enrollment public.academy_enrollments%rowtype; v_id uuid;
begin
  if p_progress_percent not between 0 and 100 then raise exception 'progress out of range'; end if;
  select * into v_enrollment from public.academy_enrollments where id=p_enrollment_id and user_id=p_user_id and status='active';
  if v_enrollment.id is null then raise exception 'active owned enrollment required'; end if;
  if not exists(select 1 from public.academy_modules where id=p_module_id and course_id=v_enrollment.course_id and status='published') then raise exception 'course module not found'; end if;
  insert into public.academy_progress(enrollment_id,module_id,progress_percent,completed_at)
  values(p_enrollment_id,p_module_id,p_progress_percent,case when p_progress_percent=100 then now() else null end)
  on conflict(enrollment_id,module_id) do update set
    progress_percent=greatest(public.academy_progress.progress_percent,excluded.progress_percent),
    completed_at=case when greatest(public.academy_progress.progress_percent,excluded.progress_percent)=100 then coalesce(public.academy_progress.completed_at,now()) else null end,
    updated_at=now()
  returning id into v_id;
  return jsonb_build_object('progressId',v_id,'progressPercent',(select progress_percent from public.academy_progress where id=v_id));
end;
$$;

create or replace function public.wrs_assess_academy_enrollment(
  p_enrollment_id uuid,p_score numeric,p_assessor_reference text,p_evidence jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_enrollment public.academy_enrollments%rowtype;
  v_course public.academy_courses%rowtype;
  v_attempt integer;
  v_assessment uuid;
  v_certificate public.academy_certificates%rowtype;
  v_total integer;
  v_complete integer;
  v_passed boolean;
begin
  select * into v_enrollment from public.academy_enrollments where id=p_enrollment_id for update;
  if v_enrollment.id is null or v_enrollment.status not in ('active','completed') then raise exception 'enrollment not assessable'; end if;
  select * into v_course from public.academy_courses where id=v_enrollment.course_id and status='published';
  if v_course.id is null then raise exception 'published course required'; end if;
  select count(*) into v_total from public.academy_modules where course_id=v_course.id and status='published';
  select count(*) into v_complete from public.academy_progress p join public.academy_modules m on m.id=p.module_id
    where p.enrollment_id=v_enrollment.id and m.course_id=v_course.id and m.status='published' and p.progress_percent=100;
  if v_total=0 or v_complete<>v_total then raise exception 'course modules are incomplete'; end if;
  select coalesce(max(attempt),0)+1 into v_attempt from public.academy_assessments where enrollment_id=v_enrollment.id;
  v_passed:=p_score>=v_course.pass_score;
  insert into public.academy_assessments(enrollment_id,attempt,score,status,evidence,assessor_reference)
  values(v_enrollment.id,v_attempt,p_score,case when v_passed then 'passed' else 'failed' end,coalesce(p_evidence,'{}'::jsonb),p_assessor_reference)
  returning id into v_assessment;
  if not v_passed then return jsonb_build_object('status','failed','assessmentId',v_assessment,'score',p_score); end if;

  update public.academy_enrollments set status='completed',completed_at=coalesce(completed_at,now()) where id=v_enrollment.id;
  insert into public.academy_certificates(user_id,course_id,enrollment_id,assessment_id,status)
  values(v_enrollment.user_id,v_course.id,v_enrollment.id,v_assessment,'active')
  on conflict(enrollment_id) do update set status='active',revoked_at=null
  returning * into v_certificate;
  perform public.wrs_append_reward_point_event(
    v_enrollment.user_id,null,100,'academy','course',v_course.id::text,
    'academy-complete:'||v_course.id||':'||v_enrollment.user_id,null,jsonb_build_object('certificateId',v_certificate.id)
  );
  return jsonb_build_object('status','passed','assessmentId',v_assessment,'certificateId',v_certificate.id,'verificationId',v_certificate.public_verification_id);
end;
$$;

create or replace function public.wrs_verify_academy_certificate(p_public_verification_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'verificationId',c.public_verification_id,
    'certificateId',c.id,
    'courseSlug',course.slug,
    'courseTitle',course.title,
    'status',c.status,
    'issuedAt',c.issued_at
  )
  from public.academy_certificates c
  join public.academy_courses course on course.id=c.course_id
  where c.public_verification_id=p_public_verification_id
$$;

create or replace function public.wrs_join_community_event(
  p_user_id uuid,p_event_id uuid,p_reminder_enabled boolean default false
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_event public.community_events%rowtype; v_participant public.community_event_participants%rowtype; v_count integer;
begin
  select * into v_event from public.community_events where id=p_event_id and status='published' for update;
  if v_event.id is null or now()>v_event.ends_at then raise exception 'community event unavailable'; end if;
  if v_event.capacity is not null then
    select count(*) into v_count from public.community_event_participants where event_id=v_event.id and status in ('joined','attended');
    if v_count>=v_event.capacity and not exists(select 1 from public.community_event_participants where event_id=v_event.id and user_id=p_user_id) then
      raise exception 'community event full';
    end if;
  end if;
  insert into public.community_event_participants(event_id,user_id,status,reminder_enabled)
  values(v_event.id,p_user_id,'joined',p_reminder_enabled)
  on conflict(event_id,user_id) do update set status='joined',reminder_enabled=excluded.reminder_enabled
  returning * into v_participant;
  return jsonb_build_object('participantId',v_participant.id,'status',v_participant.status,'reminderEnabled',v_participant.reminder_enabled);
end;
$$;

create or replace function public.wrs_verify_community_attendance(
  p_event_id uuid,p_user_id uuid,p_attendance_reference text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_participant public.community_event_participants%rowtype;
begin
  update public.community_event_participants set status='attended',attended_at=coalesce(attended_at,now()),attendance_reference=p_attendance_reference
  where event_id=p_event_id and user_id=p_user_id and status in ('joined','attended') returning * into v_participant;
  if v_participant.id is null then raise exception 'event participant not found'; end if;
  perform public.wrs_append_reward_point_event(
    p_user_id,null,25,'community','event-attendance',p_event_id::text,
    'community-attendance:'||p_event_id||':'||p_user_id,null,jsonb_build_object('attendanceReference',p_attendance_reference)
  );
  return jsonb_build_object('participantId',v_participant.id,'status',v_participant.status,'attendedAt',v_participant.attended_at);
end;
$$;

create or replace function public.wrs_set_community_leaderboard_profile(
  p_user_id uuid,p_opted_in boolean,p_display_alias text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_profile public.community_leaderboard_profiles%rowtype;
begin
  if char_length(trim(p_display_alias)) not between 2 and 40 then raise exception 'display alias invalid'; end if;
  insert into public.community_leaderboard_profiles(user_id,opted_in,display_alias)
  values(p_user_id,p_opted_in,trim(p_display_alias))
  on conflict(user_id) do update set opted_in=excluded.opted_in,display_alias=excluded.display_alias,updated_at=now()
  returning * into v_profile;
  return jsonb_build_object('optedIn',v_profile.opted_in,'displayAlias',v_profile.display_alias);
end;
$$;

create or replace function public.wrs_record_community_moderation(
  p_target_type text,p_target_id text,p_action text,p_reason text,p_operator_reference text,p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  insert into public.community_moderation_actions(target_type,target_id,action,reason,operator_reference,metadata)
  values(p_target_type,p_target_id,p_action,left(p_reason,1000),p_operator_reference,coalesce(p_metadata,'{}'::jsonb)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_ensure_referral_profile(p_user_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_code text;
begin
  select code into v_code from public.referral_profiles where user_id=p_user_id and status='active';
  if v_code is not null then return v_code; end if;
  v_code:=upper(substr(encode(gen_random_bytes(12),'hex'),1,12));
  insert into public.referral_profiles(user_id,code,status) values(p_user_id,v_code,'active')
  on conflict(user_id) do update set status='active' returning code into v_code;
  return v_code;
end;
$$;

create or replace function public.wrs_accept_referral(p_referred_user_id uuid,p_referral_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_referrer uuid; v_relation public.referral_relationships%rowtype;
begin
  select user_id into v_referrer from public.referral_profiles where code=upper(trim(p_referral_code)) and status='active';
  if v_referrer is null then raise exception 'referral code invalid'; end if;
  if v_referrer=p_referred_user_id then raise exception 'self referral prohibited'; end if;
  select * into v_relation from public.referral_relationships where referred_user_id=p_referred_user_id;
  if v_relation.id is not null then
    if v_relation.referrer_user_id<>v_referrer then raise exception 'referral already attributed'; end if;
    return jsonb_build_object('relationshipId',v_relation.id,'status',v_relation.status);
  end if;
  insert into public.referral_relationships(referrer_user_id,referred_user_id,referral_code,status)
  values(v_referrer,p_referred_user_id,upper(trim(p_referral_code)),'pending') returning * into v_relation;
  return jsonb_build_object('relationshipId',v_relation.id,'status',v_relation.status);
end;
$$;

create or replace function public.wrs_qualify_referral(p_relationship_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_relation public.referral_relationships%rowtype;
  v_policy public.referral_reward_policies%rowtype;
  v_entitlement public.package_entitlements%rowtype;
  v_referrer_reward uuid;
  v_referred_reward uuid;
begin
  select * into v_relation from public.referral_relationships where id=p_relationship_id for update;
  if v_relation.id is null then raise exception 'referral relationship not found'; end if;
  if v_relation.status='qualified' then return jsonb_build_object('status','qualified','relationshipId',v_relation.id); end if;
  if v_relation.status<>'pending' then raise exception 'referral is not qualifiable'; end if;
  if not exists(
    select 1 from public.user_profiles where user_id=v_relation.referred_user_id and status='active'
      and email_verified_at is not null and phone_verified_at is not null
  ) then raise exception 'referred account verification incomplete'; end if;
  select * into v_entitlement from public.package_entitlements
    where user_id=v_relation.referred_user_id and status='active' and source='payment' and activated_at<=now()-interval '7 days'
    order by activated_at desc limit 1;
  if v_entitlement.id is null then raise exception 'verified paid activation review window incomplete'; end if;
  select * into v_policy from public.referral_reward_policies where slug='default' and active=true;
  if v_policy.slug is null then raise exception 'referral reward policy unavailable'; end if;
  if v_policy.referrer_points>0 then
    v_referrer_reward:=public.wrs_append_reward_point_event(
      v_relation.referrer_user_id,null,v_policy.referrer_points,'referral','qualified-referral',v_relation.id::text,
      'referral-referrer:'||v_relation.id,null,jsonb_build_object('referredUserId',v_relation.referred_user_id)
    );
  end if;
  if v_policy.referred_points>0 then
    v_referred_reward:=public.wrs_append_reward_point_event(
      v_relation.referred_user_id,null,v_policy.referred_points,'referral','qualified-referral',v_relation.id::text,
      'referral-referred:'||v_relation.id,null,jsonb_build_object('referrerUserId',v_relation.referrer_user_id)
    );
  end if;
  update public.referral_relationships set status='qualified',eligible_at=v_entitlement.activated_at+interval '7 days',qualified_at=now(),
    referrer_reward_event_id=v_referrer_reward,referred_reward_event_id=v_referred_reward where id=v_relation.id;
  return jsonb_build_object('status','qualified','relationshipId',v_relation.id,'referrerPoints',v_policy.referrer_points,'referredPoints',v_policy.referred_points);
end;
$$;

-- Privileged ecosystem routines are server/service-role operations.
revoke all on function public.wrs_reward_points_balance(uuid) from public,anon,authenticated;
revoke all on function public.wrs_append_reward_point_event(uuid,uuid,integer,text,text,text,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_acquire_marketplace_item(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_install_marketplace_item(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.wrs_review_marketplace_item(uuid,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.wrs_create_event_reward_code(uuid,text,integer,timestamptz,integer) from public,anon,authenticated;
revoke all on function public.wrs_redeem_event_code(uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_activate_reward_boost(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.wrs_enroll_academy_course(uuid,uuid) from public,anon,authenticated;
revoke all on function public.wrs_record_academy_progress(uuid,uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.wrs_assess_academy_enrollment(uuid,numeric,text,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_join_community_event(uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function public.wrs_verify_community_attendance(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_set_community_leaderboard_profile(uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.wrs_record_community_moderation(text,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.wrs_ensure_referral_profile(uuid) from public,anon,authenticated;
revoke all on function public.wrs_accept_referral(uuid,text) from public,anon,authenticated;
revoke all on function public.wrs_qualify_referral(uuid) from public,anon,authenticated;

grant execute on function public.wrs_reward_points_balance(uuid) to service_role;
grant execute on function public.wrs_append_reward_point_event(uuid,uuid,integer,text,text,text,text,uuid,jsonb) to service_role;
grant execute on function public.wrs_acquire_marketplace_item(uuid,uuid,uuid,text) to service_role;
grant execute on function public.wrs_install_marketplace_item(uuid,uuid,uuid) to service_role;
grant execute on function public.wrs_review_marketplace_item(uuid,uuid,integer,text) to service_role;
grant execute on function public.wrs_create_event_reward_code(uuid,text,integer,timestamptz,integer) to service_role;
grant execute on function public.wrs_redeem_event_code(uuid,text) to service_role;
grant execute on function public.wrs_activate_reward_boost(uuid,uuid,text,text) to service_role;
grant execute on function public.wrs_enroll_academy_course(uuid,uuid) to service_role;
grant execute on function public.wrs_record_academy_progress(uuid,uuid,uuid,integer) to service_role;
grant execute on function public.wrs_assess_academy_enrollment(uuid,numeric,text,jsonb) to service_role;
grant execute on function public.wrs_join_community_event(uuid,uuid,boolean) to service_role;
grant execute on function public.wrs_verify_community_attendance(uuid,uuid,text) to service_role;
grant execute on function public.wrs_set_community_leaderboard_profile(uuid,boolean,text) to service_role;
grant execute on function public.wrs_record_community_moderation(text,text,text,text,text,jsonb) to service_role;
grant execute on function public.wrs_ensure_referral_profile(uuid) to service_role;
grant execute on function public.wrs_accept_referral(uuid,text) to service_role;
grant execute on function public.wrs_qualify_referral(uuid) to service_role;

-- Public certificate verification exposes only certificate/course status fields.
revoke all on function public.wrs_verify_academy_certificate(uuid) from public,authenticated;
grant execute on function public.wrs_verify_academy_certificate(uuid) to anon,authenticated,service_role;
