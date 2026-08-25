-- Plan 11.7 — Live recovery fingerprint (read-only).
--
-- Run immediately before a controlled recovery drill after writes are frozen,
-- then run again against the restored target. Compare both `fingerprint` and
-- `snapshot`. A mismatch must be investigated before traffic is resumed.

begin transaction read only;

with snapshot as (
  select jsonb_build_object(
    'userProfiles', (select count(*) from public.user_profiles),
    'activeUsers', (select count(*) from public.user_profiles where status = 'active'),
    'robots', (select count(*) from public.robots),
    'activeEntitlements', (select count(*) from public.package_entitlements where status = 'active'),
    'ledgerTransactions', (select count(*) from public.ledger_transactions),
    'postedLedgerTransactions', (select count(*) from public.ledger_transactions where status = 'posted'),
    'ledgerEntries', (select count(*) from public.ledger_entries),
    'ledgerAmountMinorTotal', (select coalesce(sum(amount_minor), 0) from public.ledger_entries),
    'paymentIntents', (select count(*) from public.payment_intents),
    'withdrawals', (select count(*) from public.withdrawals),
    'consentEvents', (select count(*) from public.consent_events),
    'dataAssets', (select count(*) from public.data_assets),
    'approvedDataSubmissions', (select count(*) from public.data_submissions where status = 'approved'),
    'dataDeletionRequests', (select count(*) from public.data_deletion_requests),
    'deployments', (select count(*) from public.deployments),
    'deploymentSettlements', (select count(*) from public.deployment_settlements),
    'marketplaceEntitlements', (select count(*) from public.marketplace_entitlements),
    'academyCertificates', (select count(*) from public.academy_certificates),
    'supportTickets', (select count(*) from public.support_tickets),
    'accountDeletionRequests', (select count(*) from public.account_deletion_requests),
    'securityEvents', (select count(*) from public.security_events),
    'operationsAuditEvents', (select count(*) from public.operations_audit_events),
    'latestSecurityEventId', (select coalesce(max(id), 0) from public.security_events),
    'latestOperationsAuditId', (select coalesce(max(id), 0) from public.operations_audit_events),
    'latestLedgerEntryId', (select coalesce(max(id), 0) from public.ledger_entries)
  ) as payload
)
select
  md5(payload::text) as fingerprint,
  payload as snapshot,
  now() at time zone 'utc' as captured_at_utc
from snapshot;

rollback;
