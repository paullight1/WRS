# WRS Live Activation Sequence

This is the only supported production-activation merge/promotion sequence for the current stacked WRS hardening branches.

Current stack:

- `main` — existing released baseline.
- `prod/plans-05-10` — Plans 5–10 hardening, represented by Draft PR #3 into `main`.
- `prod/plan-11-activation` — Plan 11 live-activation package, represented by Draft PR #7 into `prod/plans-05-10`.

The release remains **NO-GO** until `scripts/evaluate-live-go.mjs` and `supabase/verification/plan11_final_go_checks.sql` both pass with evidence for the exact release candidate.

## Step 1 — Freeze Plan 11 candidate

1. Stop feature work on `prod/plan-11-activation`.
2. Record its exact head SHA.
3. Ensure PR #7 is mergeable and has no unresolved review thread.
4. Run all repository-controlled checks plus applicable Plan 11 manual workflows/evidence for that head.
5. Complete `LIVE_EVIDENCE.json`; do not edit the `.example.json` into a false PASS without evidence.
6. Run the final evidence evaluator and final database GO SQL.
7. If either returns NO-GO/fails, **do not merge**.

## Step 2 — Merge PR #7 into `prod/plans-05-10`

Only after Step 1 is GO:

1. Capture PR #7's expected head SHA immediately before merge.
2. Merge PR #7 into `prod/plans-05-10` using the repository-approved method.
3. Record the resulting `prod/plans-05-10` head SHA.
4. Do not promote immediately: the stacked-branch head is now a new commit boundary and must be re-verified.

## Step 3 — Re-verify the combined Plans 5–11 head

On the resulting `prod/plans-05-10` head:

1. Re-run WRS Quality Gate.
2. Re-run Plan 10 Security and Launch Gate.
3. Re-run Plan 10 Recovery Gate.
4. Re-run all Plans 3–9 database gates against the current migration directory.
5. Re-run the relevant Plan 11 live/manual evidence checks or confirm their external provider evidence still maps to the exact same application tree/configuration.
6. Run all Plan 11 read-only Supabase verification SQL on the target database candidate.
7. Update `LIVE_EVIDENCE.json` so `releaseCommit` is the new combined branch head and repository workflow references point to the new runs.
8. Re-run `scripts/evaluate-live-go.mjs`.

Any regression returns the release to **NO-GO**.

## Step 4 — Prepare PR #3 into `main`

1. Confirm PR #3's head is the exact combined `prod/plans-05-10` SHA approved in Step 3.
2. Confirm `main` branch protection and required checks are active.
3. Confirm required independent review/approval exists and is not stale.
4. Mark PR #3 ready for review only after final GO evidence is complete.
5. Immediately before merge, record the expected head SHA and base SHA.
6. If either head/base moved unexpectedly, stop and re-run the required verification rather than force-merging.

## Step 5 — Merge and verify tree parity

1. Merge PR #3 with the recorded expected head SHA.
2. Record the resulting `main` merge commit.
3. Verify that the deployed application content/tree corresponds to the tested Plans 5–11 release candidate. A merge-topology SHA may differ from the branch head, but no unreviewed file change may enter the deployed tree.
4. If `main` receives another commit between final verification and deployment, stop the release and re-verify that new candidate.

## Step 6 — Promote/deploy

1. Promote only the build/artifact associated with the verified release tree.
2. Keep financial/sensitive capabilities fail closed until their own provider/live credentials and evidence have passed.
3. Run the live environment preflight.
4. Run the staging/production smoke appropriate to the promotion stage.
5. Run `plan11_final_go_checks.sql` against the final database after promotion and before broad traffic where operationally possible.
6. Confirm monitoring/alerts/on-call are active before removing any maintenance gate.

## Step 7 — Post-merge / post-promotion checks

Immediately after deployment:

- authentication/session smoke;
- wallet/payment health/reconciliation;
- sensitive-data worker/queue health;
- deployment/reward/support API smoke;
- operational-health SQL;
- runtime error/log review;
- browser/Web Vitals check;
- verify no critical service is silently in demo mode.

Record evidence against the final `main` merge/deployment reference.

## Rollback

Rollback is triggered if any P0/P1 condition appears during promotion/post-merge verification, including:

- auth/security boundary failure;
- financial duplicate/imbalance/reconciliation mismatch;
- sensitive-data/privacy failure;
- critical database migration/recovery issue;
- elevated serious runtime errors;
- inability to complete critical product journeys.

Use `Docs/runbooks/LIVE_RECOVERY_ROLLBACK.md`. Application rollback must remain compatible with the forward-only database schema. If safe compatibility cannot be demonstrated, enter maintenance mode and follow the database recovery/forward-fix path instead of blindly rolling application code backward.

## Absolute rule

No administrator override, direct push, force merge or provider emergency setting converts NO-GO into GO. Emergency/break-glass action must be separately documented, audited and followed by full re-verification before normal production traffic resumes.
