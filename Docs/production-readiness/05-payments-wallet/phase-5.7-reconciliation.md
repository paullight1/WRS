# Phase 5.7 — Reconciliation

## Goal
Continuously prove WRS internal financial records agree with external payment/payout providers.

## Implementation
- Import provider settlement/report data using stable external identifiers.
- Match provider events against payment, refund and payout ledger records.
- Detect missing, duplicate, amount/currency and state mismatches.
- Create reconciliation statuses, investigation notes and operational alerts.
- Define daily/manual rerun procedures and immutable resolution evidence.

## Tests / Evidence
- Fixtures include missing provider event, duplicate event, wrong amount and delayed settlement.
- Reconciliation never mutates ledger history silently.
- Mismatches create actionable alerts/runbook references.

## Exit gate
Operations can demonstrate that provider money movement and WRS ledger state reconcile for the defined settlement window.