# WRS Backup, Restore and Data-Recovery Procedure

## Authoritative stores

WRS authoritative state is PostgreSQL/Supabase Auth metadata, private Storage objects and managed payment/provider records. Git/Vercel deployments are release artifacts, not database backups.

## PostgreSQL

1. Confirm provider automated backup/PITR retention and the production project/region before launch.
2. Before a high-risk migration, capture a provider-supported logical/physical restore point.
3. Restore into an isolated recovery environment first; never overwrite production as the first diagnostic step.
4. Apply the same application version and environment schema expected at the recovery timestamp.
5. Run WRS migration/invariant suites for identity, finance, privacy, deployment, ecosystem and operations.
6. Verify ledger debits equal credits, entitlements reference valid posted transactions, deletion/audit evidence remains intact and RLS/service-role grants are unchanged.

## Private storage

Maintain an inventory relationship between database asset/attachment rows and server-owned private storage paths. Recovery must preserve access controls; restored objects remain private and must not bypass malware/scan status. Orphan-object and missing-object checks run before reopening contribution/support uploads.

## Auth and secrets

Auth-provider configuration, signing keys and server credentials are restored through the managed provider/secret manager, never from source control. If secret compromise is suspected, rotate rather than restore the compromised credential.

## Recovery exercise

The repository PostgreSQL gates continuously test that the complete migration chain can recreate authoritative schemas and invariants from a clean database. A production-provider backup/restore exercise must additionally be tested in staging with a synthetic dataset before launch and periodically afterward.

Record for every exercise: backup identifier/time, recovery environment, restore duration, data timestamp/RPO, integrity checks, application smoke/E2E result, owner, failures and remediation.

## RPO/RTO launch target

Provider-specific RPO/RTO is not assumed in code. Operations must record contracted/observed production RPO and RTO and compare them with business requirements before the launch gate can PASS.

## Failure rule

If restore evidence is missing, stale or fails integrity verification, production launch remains NO-GO for stateful critical features. Never waive backup/restore with an untested written procedure alone.
