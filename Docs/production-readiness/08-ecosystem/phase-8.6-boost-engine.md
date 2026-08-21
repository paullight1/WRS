# Phase 8.6 — Robot Boost Engine

## Goal
Make boost activation deduct real points and apply time-bounded/permanent robot effects.

## Implementation
- Define boost catalogue, cost, effect, duration, compatibility and stacking rules.
- Validate spendable point balance and entitlement server-side.
- Atomically deduct points and create boost activation/effect records.
- Calculate active effects from authoritative activation/expiry state.
- Support reversal/refund policy and prevent duplicate activation races.

## Tests / Evidence
- Insufficient points and incompatible robot fail.
- Concurrent activation cannot overspend points.
- Temporary boost expires at server-defined time and no longer affects capabilities.

## Exit gate
`Activate Boost` changes reconciled points and robot capability state through one auditable transaction.