-- Plan 11.4 — Sensitive-data activation verification (read-only).
-- Run after all WRS migrations and after exercising staging upload, scan,
-- review, deletion and export flows. This file never mutates application data.

begin transaction read only;

DO $$
BEGIN
  if to_regclass('storage.buckets') is null then
    raise exception 'WRS sensitive-data verification failed: Supabase Storage is unavailable';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'wrs-private-data'
      and name = 'wrs-private-data'
      and public = false
      and file_size_limit = 52428800
  ) then
    raise exception 'WRS sensitive-data verification failed: private bucket missing or unsafe';
  end if;

  if has_table_privilege('anon', 'public.data_assets', 'SELECT')
     or has_table_privilege('anon', 'public.data_assets', 'INSERT')
     or has_table_privilege('authenticated', 'public.data_assets', 'INSERT')
     or has_table_privilege('authenticated', 'public.data_assets', 'UPDATE')
     or has_table_privilege('authenticated', 'public.data_assets', 'DELETE') then
    raise exception 'WRS sensitive-data verification failed: browser role has unsafe data_assets privilege';
  end if;

  if has_table_privilege('authenticated', 'public.consent_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.consent_events', 'DELETE') then
    raise exception 'WRS sensitive-data verification failed: consent provenance is browser-mutable';
  end if;

  -- Any data that has progressed beyond upload must have a clean scanner result.
  if exists (
    select 1
    from public.data_assets a
    where a.status in ('submitted','processing','review','approved')
      and a.scan_status <> 'clean'
  ) then
    raise exception 'WRS sensitive-data verification failed: non-clean asset progressed into data workflow';
  end if;

  -- Active/non-deleted submissions cannot reference deleted, infected or failed assets.
  if exists (
    select 1
    from public.data_submissions s
    join public.data_assets a on a.id = s.asset_id
    where s.status not in ('deleted','rejected')
      and (a.status = 'deleted' or a.scan_status in ('infected','failed'))
  ) then
    raise exception 'WRS sensitive-data verification failed: active submission references unusable private asset';
  end if;

  -- Licensable active datasets may contain only approved, clean evidence with
  -- currently active research-licensing consent for the contributing category.
  if exists (
    select 1
    from public.dataset_items di
    join public.datasets d on d.id = di.dataset_id
    join public.data_submissions s on s.id = di.submission_id
    join public.data_assets a on a.id = s.asset_id
    where d.status = 'active'
      and (
        s.status <> 'approved'
        or a.status = 'deleted'
        or a.scan_status <> 'clean'
        or not public.wrs_has_active_consent(di.contributor_user_id, 'research-licensing', a.data_category)
      )
  ) then
    raise exception 'WRS sensitive-data verification failed: active dataset includes ineligible contributor evidence';
  end if;

  -- A paid/active dataset license must target an active dataset.
  if exists (
    select 1
    from public.dataset_licenses l
    join public.datasets d on d.id = l.dataset_id
    where l.status in ('paid','active')
      and d.status <> 'active'
  ) then
    raise exception 'WRS sensitive-data verification failed: live license targets inactive dataset';
  end if;

  -- Jobs should not remain indefinitely claimed or indefinitely due after retries.
  if exists (
    select 1
    from public.data_deletion_requests dr
    where dr.status = 'processing'
      and dr.claimed_at < now() - interval '30 minutes'
  ) then
    raise exception 'WRS sensitive-data verification failed: stale processing deletion job exists';
  end if;

  if exists (
    select 1
    from public.data_deletion_requests dr
    where dr.status in ('requested','failed')
      and dr.eligible_at < now() - interval '2 hours'
      and dr.attempt_count < 8
  ) then
    raise exception 'WRS sensitive-data verification failed: due deletion job is not being processed';
  end if;

  if exists (
    select 1
    from public.data_deletion_requests dr
    where dr.status = 'failed'
      and dr.attempt_count >= 8
  ) then
    raise exception 'WRS sensitive-data verification failed: deletion job exhausted retry policy';
  end if;

  -- Ready export manifests are audit metadata only; private storage paths must
  -- never become a bulk-object disclosure mechanism.
  if exists (
    select 1
    from public.data_export_requests er
    where er.status = 'ready'
      and coalesce(er.export_manifest::text, '') ~* 'storage_(bucket|path)'
  ) then
    raise exception 'WRS sensitive-data verification failed: export manifest leaks private storage locator';
  end if;

  raise notice 'WRS Plan 11.4 sensitive-data verification PASS';
END
$$;

rollback;
