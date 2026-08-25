# Phase 11.10 — Merge & Activation

## Goal

Package a controlled, re-verifiable route from the stacked Plan 11 branch to `main` and live deployment without allowing incomplete external evidence to be overridden.

## Database/migration position

**No new database migration is required for Phase 11.10.** The final database candidate uses the 25 migrations documented in `supabase/MIGRATION_GUIDE.md` plus the read-only Plan 11 verification SQL files.

## Repository implementation

- Added `Docs/releases/LIVE_ACTIVATION_SEQUENCE.md` describing the exact stacked-PR merge sequence: PR #7 → `prod/plans-05-10` → re-verification → PR #3 → `main` → post-merge/promotion checks.
- Requires expected head/base SHA capture, re-verification of the combined Plans 5–11 head and a second final evidence evaluation before PR #3 may be merged.
- Requires post-merge tree/content parity and post-promotion smoke/operational checks.
- Keeps forward-only database compatibility explicit during application rollback.

## Current state

**DO NOT MERGE. CURRENT DECISION: NO-GO.**

`Docs/production-readiness/11-live-activation/LIVE_EVIDENCE.example.json` remains fail closed and is not a completed `LIVE_EVIDENCE.json`. The external staging/provider/governance/human evidence has not been supplied yet.

Before any future merge/promotion:

1. create a completed `LIVE_EVIDENCE.json` from the example using real evidence;
2. run every required Plan 11 live/manual drill;
3. run `supabase/verification/plan11_final_go_checks.sql` on the exact database candidate;
4. run `scripts/evaluate-live-go.mjs` and require GO;
5. follow the stacked re-verification sequence in `LIVE_ACTIVATION_SEQUENCE.md`;
6. perform the post-merge/post-deployment verification and rollback immediately on any P0/P1 regression.

## Review and improvements

- Plan 11 does not bypass the existing Draft PR #3; it composes into it and forces a fresh combined-head verification.
- Merge topology cannot be treated as equivalent to verified content if unreviewed file changes enter the tree.
- A changed base/head between approval and merge invalidates the release decision.
- Live feature activation is capability-specific: financial/sensitive functions remain fail closed until their provider evidence passes even if unrelated public surfaces are otherwise deployable.

## Classification

**ACTIVATION PACKAGE COMPLETE / LIVE RELEASE NO-GO.**

All repository SQL, scripts, workflows, runbooks and decision controls needed to perform Plan 11 later are now defined. Actual merge and production activation are intentionally not performed because external evidence remains incomplete.
