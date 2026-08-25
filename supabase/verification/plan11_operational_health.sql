-- Plan 11.5 — Operational health verification (read-only).
-- Intended for staging/live activation checks and incident triage. Thresholds
-- are deliberately conservative: a violation should be reviewed, not ignored.

begin transaction read only;

DO $$
BEGIN
  if exists (
    select 1
    from public.financial_provider_events e
    where e.processed_at is null
      and e.received_at < now() - interval '10 minutes'
  ) then
    raise exception 'WRS operational verification failed: stale unprocessed payment provider event';
  end if;

  if exists (
    select 1
    from public.payment_intents p
    where p.status in ('initialized','pending')
      and p.created_at < now() - interval '1 hour'
  ) then
    raise exception 'WRS operational verification failed: stale payment intent';
  end if;

  if exists (
    select 1
    from public.withdrawals w
    where w.status in ('reserved','provider_pending')
      and w.updated_at < now() - interval '1 hour'
  ) then
    raise exception 'WRS operational verification failed: stale withdrawal';
  end if;

  if exists (
    select 1
    from public.financial_reconciliations r
    where r.matched = false
      and r.checked_at > now() - interval '24 hours'
  ) then
    raise exception 'WRS operational verification failed: recent financial reconciliation mismatch';
  end if;

  if exists (
    select 1
    from public.data_deletion_requests d
    where d.status = 'processing'
      and d.claimed_at < now() - interval '30 minutes'
  ) then
    raise exception 'WRS operational verification failed: stuck sensitive-data deletion';
  end if;

  if exists (
    select 1
    from public.data_deletion_requests d
    where d.status = 'failed'
      and d.attempt_count >= 8
  ) then
    raise exception 'WRS operational verification failed: sensitive-data deletion exhausted retries';
  end if;

  if exists (
    select 1
    from public.account_deletion_requests d
    where d.status = 'processing'
      and d.claimed_at < now() - interval '1 hour'
  ) then
    raise exception 'WRS operational verification failed: stuck account deletion';
  end if;

  if exists (
    select 1
    from public.account_deletion_requests d
    where d.status = 'failed'
      and d.attempt_count >= 8
  ) then
    raise exception 'WRS operational verification failed: account deletion exhausted retries';
  end if;

  if exists (
    select 1
    from public.support_tickets t
    where t.status in ('open','in_progress')
      and t.priority = 'urgent'
      and t.created_at < now() - interval '30 minutes'
  ) then
    raise exception 'WRS operational verification failed: urgent support case exceeded activation threshold';
  end if;

  if exists (
    select 1
    from public.deployment_incidents i
    where i.severity = 'critical'
      and i.occurred_at > now() - interval '24 hours'
  ) then
    raise exception 'WRS operational verification failed: recent critical deployment incident exists';
  end if;

  -- A long-running deployment is not stale merely because its row has not
  -- transitioned recently. Treat it as stale only when state, event and work
  -- evidence have all been quiet for 24 hours.
  if exists (
    select 1
    from public.deployments d
    where d.status = 'active'
      and greatest(
        d.updated_at,
        coalesce((select max(e.occurred_at) from public.deployment_events e where e.deployment_id=d.id), d.updated_at),
        coalesce((select max(w.recorded_at) from public.deployment_work_logs w where w.deployment_id=d.id), d.updated_at)
      ) < now() - interval '24 hours'
  ) then
    raise exception 'WRS operational verification failed: active deployment has no recent state/work evidence';
  end if;

  raise notice 'WRS Plan 11.5 operational-health verification PASS';
END
$$;

rollback;
