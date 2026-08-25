-- Plan 11.3 — Paystack / WRS financial activation verification (read-only).
-- Run after applying all WRS migrations and after exercising the staging
-- payment/webhook/refund/withdrawal flows. This file never mutates data.

begin transaction read only;

DO $$
BEGIN
  if to_regclass('public.ledger_transactions') is null
     or to_regclass('public.ledger_entries') is null
     or to_regclass('public.payment_intents') is null
     or to_regclass('public.withdrawals') is null
     or to_regclass('public.financial_reconciliations') is null then
    raise exception 'WRS payment verification failed: Plan 5 finance schema is incomplete';
  end if;

  if exists (
    select 1
    from public.ledger_transactions t
    left join lateral (
      select
        coalesce(sum(case when e.direction = 'debit' then e.amount_minor else 0 end), 0) as debits,
        coalesce(sum(case when e.direction = 'credit' then e.amount_minor else 0 end), 0) as credits
      from public.ledger_entries e
      where e.transaction_id = t.id
    ) totals on true
    where t.status = 'posted'
      and (totals.debits = 0 or totals.debits <> totals.credits)
  ) then
    raise exception 'WRS payment verification failed: unbalanced posted ledger transaction exists';
  end if;

  if exists (
    select 1
    from public.payment_intents pi
    where pi.status = 'succeeded'
      and (
        pi.provider_reference is null
        or pi.settlement_transaction_id is null
        or not exists (
          select 1
          from public.package_entitlements pe
          where pe.user_id = pi.user_id
            and pe.package_slug = pi.package_slug
            and pe.status = 'active'
            and pe.source = 'payment'
            and pe.source_reference = pi.provider_reference
        )
      )
  ) then
    raise exception 'WRS payment verification failed: succeeded payment lacks settlement/entitlement evidence';
  end if;

  if exists (
    select 1
    from public.withdrawals w
    where w.status = 'succeeded'
      and (w.provider_reference is null or w.settlement_transaction_id is null)
  ) then
    raise exception 'WRS payment verification failed: succeeded withdrawal lacks provider/ledger settlement evidence';
  end if;

  if exists (
    select 1
    from public.financial_provider_events e
    where e.processed_at is null
      and e.received_at < now() - interval '10 minutes'
  ) then
    raise exception 'WRS payment verification failed: stale unprocessed provider webhook exists';
  end if;

  if exists (
    select 1
    from public.financial_reconciliations r
    where r.matched = false
      and r.checked_at > now() - interval '24 hours'
  ) then
    raise exception 'WRS payment verification failed: recent provider reconciliation mismatch exists';
  end if;

  if not exists (select 1 from public.package_prices where active = true and amount_minor > 0) then
    raise exception 'WRS payment verification failed: no active authoritative package prices';
  end if;

  if has_table_privilege('authenticated', 'public.ledger_entries', 'INSERT')
     or has_table_privilege('authenticated', 'public.ledger_entries', 'UPDATE')
     or has_table_privilege('authenticated', 'public.ledger_entries', 'DELETE') then
    raise exception 'WRS payment verification failed: browser role can mutate ledger entries';
  end if;

  raise notice 'WRS Plan 11.3 payment verification PASS';
END
$$;

rollback;
