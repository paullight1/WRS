# Phase 11.9 — Final GO/NO-GO evidence gate

## Goal
Turn launch readiness into a deterministic decision.

## Rule
`npm run plan11:gate` must pass with every required gate marked PASS. `FAIL`, `PENDING` or `EXTERNAL_BLOCKER` is NO-GO. Repository CI cannot override missing live evidence.

## Exit gate
Strict evaluator exits zero on the exact release-candidate evidence matrix and full Plans 1–11 regression gates pass.