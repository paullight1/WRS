-- Plan 11.9 — Final WRS database GO verification (read-only).
-- Run on the exact staging/production database candidate immediately before
-- the final evidence package is marked GO. This does not replace the more
-- detailed Plan 11 payment/data/operational verification files.

begin transaction read only;

DO $$
BEGIN
  if to_regclass('storage.buckets') is null
     or not exists (
       select 1 from storage.buckets
       where id='wrs-private-data' and public=false and file_size_limit=52428800
     ) then
    raise exception 'FINAL GO failed: private WRS storage bucket is missing or unsafe';
  end if;

  if exists (
    select 1
    from public.ledger_transactions t
    left join lateral (
      select
        coalesce(sum(case when e.direction='debit' then e.amount_minor else 0 end),0) debits,
        coalesce(sum(case when e.direction='credit' then e.amount_minor else 0 end),0) credits
      from public.ledger_entries e
      where e.transaction_id=t.id
    ) totals on true
    where t.status='posted'
      and (totals.debits=0 or totals.debits<>totals.credits)
  ) then
    raise exception 'FINAL GO failed: unbalanced posted financial journal';
  end if;

  if exists (
    select 1 from public.financial_provider_events
    where processed_at is null and received_at < now()-interval '10 minutes'
  ) then
    raise exception 'FINAL GO failed: stale unprocessed financial provider event';
  end if;

  if exists (
    select 1 from public.financial_reconciliations
    where matched=false and checked_at > now()-interval '24 hours'
  ) then
    raise exception 'FINAL GO failed: recent financial reconciliation mismatch';
  end if;

  if exists (
    select 1 from public.data_assets
    where status in ('submitted','processing','review','approved') and scan_status<>'clean'
  ) then
    raise exception 'FINAL GO failed: non-clean private asset progressed into data workflow';
  end if;

  if exists (
    select 1 from public.data_deletion_requests
    where (status='processing' and claimed_at < now()-interval '30 minutes')
       or (status='failed' and attempt_count>=8)
  ) then
    raise exception 'FINAL GO failed: unresolved sensitive-data deletion blocker';
  end if;

  if exists (
    select 1 from public.account_deletion_requests
    where (status='processing' and claimed_at < now()-interval '1 hour')
       or (status='failed' and attempt_count>=8)
  ) then
    raise exception 'FINAL GO failed: unresolved account-deletion blocker';
  end if;

  if exists (
    select 1 from public.deployment_incidents
    where severity='critical' and occurred_at > now()-interval '24 hours'
  ) then
    raise exception 'FINAL GO failed: recent critical deployment incident';
  end if;

  if exists (
    select 1 from public.support_tickets
    where status in ('open','in_progress') and priority='urgent'
      and created_at < now()-interval '30 minutes'
  ) then
    raise exception 'FINAL GO failed: urgent production support blocker remains open';
  end if;

  if has_table_privilege('authenticated','public.ledger_entries','INSERT')
     or has_table_privilege('authenticated','public.data_assets','INSERT')
     or has_table_privilege('authenticated','public.operations_audit_events','UPDATE') then
    raise exception 'FINAL GO failed: browser role has unsafe authoritative-data privileges';
  end if;

  raise notice 'WRS Plan 11 FINAL database GO verification PASS';
END
$$;

rollback;
