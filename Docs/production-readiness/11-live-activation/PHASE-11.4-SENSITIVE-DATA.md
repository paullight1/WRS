# Phase 11.4 — Sensitive-Data Infrastructure

## Goal

Prepare the real WRS private-storage, scanner, deletion, export and licensing activation path so it can be executed later without redesign or database ambiguity.

## SQL/migration position

**No new base migration is required for the Plan 6 privacy model.** The authoritative schema and functions already live in:

- `20260822060000_plan6_data_privacy.sql`
- `20260822061000_plan6_deletion_distribution_hardening.sql`
- `20260822062000_plan6_data_tasks.sql`
- `20260822063000_plan6_deletion_queue.sql`

Plan 11 adds only the provider-specific storage bootstrap:

- `20260825010000_plan11_storage_activation.sql`

That migration creates/locks down the private `wrs-private-data` Supabase Storage bucket when applied in a real Supabase project. The complete order is documented in `supabase/MIGRATION_GUIDE.md`.

## Verification and activation artifacts

- `supabase/verification/plan11_data_checks.sql` — read-only checks for bucket privacy, scan-before-use invariants, consent/licensing eligibility, deletion queue health, export privacy and browser privileges.
- `Docs/runbooks/SENSITIVE_DATA_ACTIVATION.md` — staging-first clean/infected scan, deletion, account freeze, export and licensing drills.
- Existing server paths remain authoritative: signed upload/download grants are service-role mediated; scanner/review/deletion callbacks use separate internal secrets.

## Review and improvements

- Kept private storage closed to broad `anon`/`authenticated` object policies.
- Preserved the two-hour upload-grant grace period before irreversible storage deletion.
- Added live verification that submitted/review/approved assets cannot have a non-clean scanner state.
- Added live verification that active licensable datasets contain only approved, clean, consent-eligible contributions.
- Added stale/exhausted deletion-job checks so privacy deletion cannot silently stall.
- Added export-manifest checks to prevent storage bucket/path leakage.
- Kept synthetic malware simulation vendor-controlled; no real malicious payload is stored in the repository.

## Classification

**SQL/RUNBOOK READY / EXTERNAL BLOCKER.**

The database/storage policy and manual activation evidence path are complete. Actual Supabase Storage, scanner callbacks, deletion-worker execution, synthetic staging uploads and privacy/legal approval remain `EXTERNAL BLOCKER` evidence that you will supply later. Production sensitive-data handling remains NO-GO until those drills and both read-only SQL verification files pass on the real WRS environment.
