# Phase 5.1 — Financial Ledger Architecture

## Goal
Create the accounting source of truth for every WRS monetary value before enabling real payments or withdrawals.

## Implementation
- Define ledger accounts, immutable entries, transactions, payment intents, withdrawals, refunds, settlements and reconciliation records.
- Use double-entry accounting with balanced debits/credits and explicit currencies.
- Separate available, pending and restricted funds through accounts/states rather than client-side arithmetic.
- Require reference/idempotency keys for external financial events.
- Define correction through compensating entries; never edit/delete settled ledger history.

## Tests / Evidence
- Every transaction balances to zero across entries.
- Invalid currency/account combinations fail.
- Concurrent writes preserve invariants.
- Historical balances can be reconstructed from entries.

## Exit gate
Every amount WRS will display or move has a documented ledger representation and immutable audit trail.