# Phase 2.3 — Unit Test Baseline

## Goal
Create fast deterministic tests for WRS business logic and critical UI behavior.

## Implementation
- Add Vitest and React Testing Library.
- Extract pure logic from screens for package eligibility, reward/XP calculation, money formatting, state transitions and validation.
- Test shared UI primitives and error/empty/loading states where regressions would affect many screens.
- Use deterministic fixtures rather than production-like hard-coded globals.
- Set an initial coverage floor for critical modules, then increase it as production services are added.

## Tests / Evidence
- Tests include positive, boundary and negative cases.
- No network or real-clock dependence in unit suites unless explicitly controlled.
- Test command exits non-zero on failure.

## Exit gate
Critical business rules have executable unit specifications and the suite is fast enough to run on every change.