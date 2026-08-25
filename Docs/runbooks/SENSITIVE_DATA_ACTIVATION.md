# WRS Sensitive-Data Activation Runbook

Use this runbook only against the dedicated WRS **staging** environment first. Repeat in production only after staging evidence is accepted and the privacy/legal review authorizes activation.

## Prerequisites

- All 25 WRS Supabase migrations applied in timestamp order.
- `supabase/verification/plan11_post_migration_checks.sql` passes.
- Private bucket `wrs-private-data` exists, is not public, and has the 50 MB policy from the Plan 11 storage migration.
- WRS staging uses its own Supabase project, service/secret key and internal worker secrets.
- A scanner integration is configured to report results only through `/api/data/scan` using `WRS_DATA_SCANNER_SECRET`.
- The deletion worker can call `/api/data/delete/process` using `WRS_DATA_DELETION_SECRET`.
- The review service/operator uses `WRS_DATA_REVIEW_SECRET` for authoritative quality decisions.

## Drill A — Consent and clean upload

1. Create/use a synthetic staging test user. Do not use a real biometric subject for the activation drill.
2. Record the correct consent purpose/version for the data category being tested.
3. Request an upload grant through the WRS staging API.
4. Confirm the returned object path is server-generated under the user prefix and the bucket is `wrs-private-data`.
5. Upload a harmless test file whose MIME type and size are allowed.
6. Mark upload completion through the WRS flow; the asset must remain `scan_status=pending` until the scanner reports a result.
7. Confirm submission is rejected while scan status is pending.
8. Have the scanner report `clean` through the authenticated scanner callback.
9. Submit the asset and complete the authoritative data review.
10. Confirm the approved submission references a clean, non-deleted asset and preserves the original consent event ID.

Save: test user ID, asset ID, submission ID, consent event ID, scanner event timestamp and review reference. Do not save raw private object bytes in the release evidence package.

## Drill B — Infected/failed scan is blocked

1. Use the scanner vendor's documented harmless test fixture or simulation mechanism; do not upload uncontrolled malicious software.
2. Upload the test object through the same signed-grant path.
3. Report `infected` (and separately exercise `failed` if the scanner supports a failure simulation).
4. Confirm WRS refuses data submission and the object never becomes approved or licensable.
5. Confirm scanner errors are observable and do not cause a fail-open transition to `clean`.

## Drill C — Deletion worker

1. Request deletion for the clean synthetic asset.
2. Confirm the database queues the request and respects the two-hour signed-upload-grant grace period.
3. After the request is eligible, invoke the deletion worker.
4. Confirm the private object is removed before the database request is marked complete.
5. Confirm the `data_assets` and associated `data_submissions` rows become tombstoned/deleted only after successful storage deletion.
6. Simulate a storage deletion failure and confirm the job becomes retryable rather than falsely completed.
7. Confirm retries stop at the documented bounded attempt policy and exhausted jobs surface as an operational blocker.

## Drill D — Account-wide privacy freeze

1. Request an account-wide data deletion for a synthetic test account.
2. Confirm new sensitive-data asset registration is immediately rejected while the request is pending/processing/failed.
3. Confirm existing objects are swept through the worker in bounded batches.
4. Confirm no deleted submission remains eligible in an active dataset.

## Drill E — Data export

1. Request a data export through WRS.
2. Confirm the manifest contains auditable account/consent/submission metadata appropriate to the export policy.
3. Confirm it does **not** expose `storage_bucket`, `storage_path`, service-role credentials, signed upload tokens, scanner secrets or other users' data.
4. Confirm export expiry/cleanup behavior is configured for the deployed environment.

## Drill F — Licensing consent

1. Use only an approved clean synthetic submission.
2. Grant the independent `research-licensing` consent for its data category.
3. Add it to a staging dataset and exercise the staging license/distribution path.
4. Confirm contributor allocation is ledger-backed and idempotent.
5. Withdraw `research-licensing` consent.
6. Confirm future licensing/distribution eligibility is blocked while historical consent/audit/financial evidence remains append-only.
7. Confirm deleted/rejected/non-clean submissions cannot be included in an active licensable dataset.

## Verification SQL

After the drills, run both read-only files:

1. `supabase/verification/plan11_post_migration_checks.sql`
2. `supabase/verification/plan11_data_checks.sql`

Both must pass before sensitive data can move from staging-only validation to production activation review.

## Evidence to retain

Record only identifiers and verification metadata:

- environment/project reference;
- deployment commit SHA;
- test user ID;
- consent event IDs;
- asset/submission IDs;
- scanner clean/infected/failed result timestamps;
- deletion request IDs and attempts;
- export request ID;
- dataset/license/allocation IDs used for the synthetic licensing drill;
- SQL verification timestamps/results;
- responsible operator/reviewer.

Never put service-role keys, worker tokens, signed upload URLs, full biometric/media content or payment credentials into GitHub evidence.

## Fail-closed rule

Any missing scanner, deletion worker, private storage, consent, export, SQL verification, or legal/privacy sign-off keeps sensitive-data production activation **NO-GO**.
