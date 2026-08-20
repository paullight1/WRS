# Phase 5.5 — Real Wallet

## Goal
Replace static wallet figures with ledger-derived balances and transaction history.

## Implementation
- Build wallet APIs for available, pending and restricted balances from ledger projections.
- Return transaction history with authoritative state and references.
- Define deposit/funding behavior only for supported payment rails.
- Keep cached projections reconcilable to immutable entries.
- Add pagination, currency handling and safe precision/decimal types.

## Tests / Evidence
- Wallet total equals sum of ledger positions.
- Pending settlements do not become withdrawable early.
- Pagination/filtering never changes totals.
- Empty/error/offline frontend states use real API behavior.

## Exit gate
Every wallet number is derived from reconciled ledger state and remains correct across refresh/devices.