# Phase 5.3 — Financial Idempotency

## Goal
Ensure retries, duplicate webhooks and concurrent requests cannot double-charge, double-credit or double-activate benefits.

## Implementation
- Require idempotency keys on payment creation, provider events, refunds, withdrawals and settlement operations.
- Add unique constraints around external event IDs and business references.
- Make handlers safely replayable and return the existing result where appropriate.
- Define retry/backoff strategy for transient provider errors.
- Record duplicate-event observations for monitoring without creating duplicate ledger entries.

## Tests / Evidence
- Replay the same webhook many times: one financial effect.
- Race two identical requests concurrently.
- Retry after network timeout without double effect.

## Exit gate
Every financial mutation can be retried safely and duplicate external events cannot change balances twice.