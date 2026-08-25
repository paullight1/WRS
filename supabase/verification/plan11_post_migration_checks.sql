-- WRS Supabase post-migration verification (read-only).
--
-- Run this only AFTER all files in supabase/migrations have been applied in
-- timestamp order. It does not insert, update, or delete application data.
-- Any missing/unsafe critical boundary raises an exception and aborts.

begin transaction read only;

DO $$
DECLARE
  relation_name text;
  routine_name text;
  rls_relation text;
BEGIN
  -- Critical authoritative relations spanning Plans 3–9.
  foreach relation_name in array ARRAY[
    'public.user_profiles',
    'public.user_sessions',
    'public.security_events',
    'public.auth_rate_limit_buckets',
    'public.robots',
    'public.package_entitlements',
    'public.robot_configurations',
    'public.robot_xp_events',
    'public.robot_public_passports',
    'public.package_prices',
    'public.ledger_transactions',
    'public.ledger_entries',
    'public.payout_methods',
    'public.consent_events',
    'public.data_assets',
    'public.data_submissions',
    'public.datasets',
    'public.dataset_licenses',
    'public.contributor_allocations',
    'public.data_deletion_requests',
    'public.deployment_preferences',
    'public.deployment_opportunities',
    'public.marketplace_items',
    'public.marketplace_versions',
    'public.user_settings',
    'public.account_deletion_requests',
    'public.support_tickets',
    'public.support_messages',
    'public.operations_audit_events'
  ] loop
    if to_regclass(relation_name) is null then
      raise exception 'WRS verification failed: missing relation %', relation_name;
    end if;
  end loop;

  -- RLS must remain enabled on user/security-sensitive relations.
  foreach rls_relation in array ARRAY[
    'user_profiles',
    'user_sessions',
    'security_events',
    'robots',
    'package_entitlements',
    'robot_configurations',
    'robot_xp_events',
    'consent_events',
    'data_assets',
    'data_submissions',
    'data_deletion_requests',
    'support_tickets',
    'support_messages',
    'account_deletion_requests'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = rls_relation
        and c.relrowsecurity = true
    ) then
      raise exception 'WRS verification failed: RLS is not enabled on public.%', rls_relation;
    end if;
  end loop;

  -- Service-owned routines that underpin the production API.
  foreach routine_name in array ARRAY[
    'wrs_consume_auth_rate_limit',
    'wrs_complete_robot_onboarding',
    'wrs_save_robot_configuration',
    'wrs_append_robot_xp_event',
    'wrs_create_payment_intent',
    'wrs_settle_payment',
    'wrs_reserve_withdrawal',
    'wrs_wallet_snapshot',
    'wrs_record_consent',
    'wrs_register_data_asset',
    'wrs_submit_data_asset',
    'wrs_review_data_submission',
    'wrs_request_data_deletion',
    'wrs_claim_next_data_deletion',
    'wrs_distribute_dataset_license',
    'wrs_request_deployment',
    'wrs_acquire_marketplace_item',
    'wrs_install_marketplace_item',
    'wrs_update_profile',
    'wrs_update_user_settings',
    'wrs_create_support_ticket',
    'wrs_record_operations_action'
  ] loop
    if not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = routine_name
    ) then
      raise exception 'WRS verification failed: missing routine public.%', routine_name;
    end if;
  end loop;

  -- Append-only audit/financial/progression evidence must not be browser-mutable.
  if has_table_privilege('authenticated', 'public.security_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.security_events', 'DELETE') then
    raise exception 'WRS verification failed: authenticated can mutate security_events';
  end if;
  if has_table_privilege('authenticated', 'public.ledger_entries', 'INSERT')
     or has_table_privilege('authenticated', 'public.ledger_entries', 'UPDATE')
     or has_table_privilege('authenticated', 'public.ledger_entries', 'DELETE') then
    raise exception 'WRS verification failed: authenticated can mutate ledger_entries';
  end if;
  if has_table_privilege('authenticated', 'public.operations_audit_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.operations_audit_events', 'DELETE') then
    raise exception 'WRS verification failed: authenticated can rewrite operations audit';
  end if;

  -- Plan 11 storage bootstrap: private 50 MB bucket, never public.
  if not exists (
    select 1
    from storage.buckets
    where id = 'wrs-private-data'
      and name = 'wrs-private-data'
      and public = false
      and file_size_limit = 52428800
  ) then
    raise exception 'WRS verification failed: wrs-private-data bucket missing or unsafe';
  end if;

  raise notice 'WRS Supabase post-migration verification PASS';
END
$$;

rollback;
