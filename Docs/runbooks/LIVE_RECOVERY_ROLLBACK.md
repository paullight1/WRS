# WRS Live Recovery & Rollback Runbook

Plan 10 already proves that the complete WRS migration chain can be dumped and restored into a separate PostgreSQL 17 database. This runbook is for the later **provider-level** WRS staging/production recovery drill.

## Recovery objectives

Before activation, record the agreed:

- **RPO** — maximum acceptable data loss window for the release mode.
- **RTO** — maximum acceptable time to restore WRS service.
- release owner;
- database recovery owner;
- application rollback owner;
- incident commander.

Financial, identity, consent/audit and deployment evidence should use the strictest recovery expectations because those histories are authoritative and often append-only.

## Pre-drill preparation

1. Use the dedicated WRS staging project first.
2. Confirm all 25 migrations and current verification SQL files pass.
3. Record the exact application commit/deployment ID.
4. Stop synthetic staging writes or put the drill environment into a maintenance/freeze window.
5. Run `supabase/verification/plan11_recovery_fingerprint.sql` and save the returned fingerprint/snapshot.
6. Record the provider backup/PITR restore point and UTC timestamp.
7. Record the current Vercel deployment to which rollback will return.

## Supabase provider recovery drill

1. Use the supported Supabase backup/PITR mechanism for the WRS staging project.
2. Restore to a separate/isolated recovery target when the provider supports it; do not overwrite the only working copy just to prove a drill.
3. Confirm the recovered database reaches the intended point in time.
4. Run:
   - `supabase/verification/plan11_post_migration_checks.sql`
   - `supabase/verification/plan11_payment_checks.sql`
   - `supabase/verification/plan11_data_checks.sql`
   - `supabase/verification/plan11_operational_health.sql`
   - `supabase/verification/plan11_recovery_fingerprint.sql`
5. Compare the post-restore fingerprint/snapshot with the frozen pre-drill result. Investigate any mismatch before reopening traffic.
6. Confirm financial journals remain balanced, idempotency/provider references remain unique, consent/audit events remain intact, and no deleted private-data evidence becomes active again.
7. Confirm Auth/Storage dependencies and the private `wrs-private-data` bucket are present in the restored environment.
8. Record actual restore duration and compare it with the RTO/RPO target.

## Vercel application rollback drill

1. Deploy the candidate to WRS staging.
2. Record the deployment ID/URL and candidate commit.
3. Exercise a basic smoke journey and capture a request ID.
4. Promote or deploy a deliberately harmless staging-only change that can be rolled back.
5. Use the supported Vercel rollback/promote mechanism to return to the previously recorded deployment.
6. Confirm the staging URL resolves to the expected prior build.
7. Re-run the staging HTTP preflight and critical browser smoke.
8. Confirm rollback does not change the database schema backward; WRS database migrations are forward-only. Application rollback must remain compatible with already-applied migrations or the release must not proceed.
9. Record actual rollback duration and compare it with the RTO target.

## Post-rollback finance/privacy checks

After any rollback/recovery drill:

- no payment/webhook should be replayed into a duplicate ledger posting;
- no wallet balance should derive from client state;
- no completed privacy deletion should resurrect active/licensable data;
- no account/session security state should regain access unexpectedly;
- no deployment settlement should duplicate;
- operational-health SQL must pass before traffic resumes.

## Evidence package

Retain:

- pre/post fingerprint JSON and hash;
- provider backup/PITR restore reference;
- restore target/project reference;
- Vercel before/candidate/rollback deployment IDs;
- exact commit SHAs;
- SQL verification results;
- timestamps, measured RPO/RTO, incident timeline;
- named recovery/rollback owners;
- any mismatch and remediation.

Do not retain database passwords, Supabase secret keys, signed URLs or private user content in GitHub evidence.

## Fail-closed rule

WRS remains **NO-GO** if a provider-level restore has not been proven, fingerprint/invariant checks do not match expectations, rollback cannot meet the agreed RTO, or the application cannot safely run after a forward-only migration.
