# Phase 4.6 — XP and Level Engine

## Goal
Replace mutable/display-only XP with an auditable event-driven progression system.

## Implementation
- Create append-only XP events with source, amount, robot/user, reference, timestamp and metadata.
- Derive total XP/level from validated events or a safely reconciled projection.
- Enforce one reward per qualifying source using unique/idempotency constraints.
- Define level thresholds and capability unlock events centrally.
- Add compensating/reversal events instead of deleting history.

## Tests / Evidence
- Duplicate activity cannot award XP twice.
- Concurrent reward events produce deterministic totals.
- Reversal/revocation recalculates level correctly.
- UI totals match backend projections.

## Exit gate
Every XP point and level change is attributable to an immutable qualifying event, not client-side arithmetic.