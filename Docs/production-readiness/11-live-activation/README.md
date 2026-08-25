# Plan 11 — Live Production Activation

Plan 11 converts the code-side production-ready WRS candidate into an evidence-backed live release. It is fail-closed: repository tests may prove implementation quality, but provider, staging, operational, legal, governance and human-review gates remain blocking until real evidence exists.

## Execution loop

For each phase: define evidence → run the real probe/drill → record result and owner → review P0/P1 findings → fix → rerun → only then mark PASS.

## Phases

1. 11.1 Dedicated staging/production infrastructure
2. 11.2 Repository governance and required checks
3. 11.3 Real payment/payout sandbox verification
4. 11.4 Sensitive-data storage/scanning/deletion verification
5. 11.5 Live observability, alert routing and incident exercise
6. 11.6 Production-like staging E2E, accessibility and Web Vitals
7. 11.7 Provider backup/PITR and hosting rollback drill
8. 11.8 Human accessibility, privacy/legal/compliance sign-off
9. 11.9 Final GO/NO-GO evidence gate
10. 11.10 Merge, promote and controlled feature activation

`EVIDENCE_MATRIX.json` is the machine-readable source of launch truth. `npm run plan11:gate` exits non-zero until every required gate is PASS.

## Frozen application candidate

The live-evidence process currently targets application candidate `900068dda9802129ff312de828fd3735273af1db`. The Plan 11 activation workflow checks that later commits are evidence/governance-only; any runtime drift requires a new application candidate before evidence collection can continue.

The repository activation framework is intentionally separate from the live GO decision. A green PR/CI state does not override an `EXTERNAL_BLOCKER`, and PR #4 remains draft until the strict all-PASS gate succeeds for the selected application candidate.
