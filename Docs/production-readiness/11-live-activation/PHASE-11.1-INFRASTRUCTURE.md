# Phase 11.1 — Production Infrastructure

## Goal

Prepare isolated WRS staging/production infrastructure contracts and a complete Supabase SQL handoff without reusing unrelated products or requiring live provisioning during repository hardening.

## Repository work completed

- Created `prod/plan-11-activation` from the certified Plans 5–10 head.
- Created draft PR #7 with base `prod/plans-05-10`.
- Added `.env.live.example` as the canonical live environment-name manifest.
- Added `scripts/validate-live-env.mjs` with fail-closed checks for runtime authority, all seven production service flags, Supabase authority, Paystack environment keys, private storage and internal worker/operator credentials.
- Added behavior tests proving incomplete infrastructure fails, complete synthetic staging passes and a production environment cannot use a Paystack sandbox key.
- Added the complete ordered Supabase migration/verification handoff under `supabase/`.

## Supabase SQL handoff

The repository now contains **25 ordered migration files** documented in `supabase/MIGRATION_GUIDE.md`.

The final activation migration is:

`20260825010000_plan11_storage_activation.sql`

It bootstraps/locks down the `wrs-private-data` private Supabase Storage bucket in a real Supabase project. It remains portable in generic PostgreSQL CI by skipping only the managed Storage insert when `storage.buckets` is unavailable; the real Supabase post-migration verification still fails if Storage/bucket configuration is missing.

Read-only live verification queries are indexed in `supabase/verification/README.md`.

## Connected-resource discovery

### Supabase

Connected organization discovered during the audit: `crescivacapital` (`tegnlcoyogetgcyiwnaj`).

Connected project:

- `cresciva Project` (`fqragjhmunphhdnmvpgs`) — unrelated to WRS and deliberately **not reused**.

No WRS project was provisioned. Per the current handoff decision, the migrations will be applied manually later to dedicated WRS projects.

### Vercel

Connected team during discovery: `nwosupaul3-gmailcom's projects` (`team_0m722looHPylaECSCKh2f6oa`). Project discovery returned **0 projects**.

No Vercel project was provisioned or reused. Deployment/environment configuration remains a later manual/live step.

## Review and improvements

- Rejected reuse of Cresciva infrastructure to prevent cross-product data/secret contamination.
- Isolated Plan 11 Git history from the large Plans 5–10 PR.
- Added explicit Paystack test/live-key separation.
- Required distinct high-entropy credentials for scanner, privacy deletion, deployment operations, ecosystem operations, academy assessment, community attendance/moderation, referral qualification and account-deletion workers.
- Added an exact migration-order guide, forward-only rollback policy and read-only post-install verification SQL.
- Existing Plans 3–9 PostgreSQL regression gates continue to apply the Plan 11 migration directory so migration portability/regressions are caught before handoff.

## Classification

**SQL/REPOSITORY READY — MANUAL LIVE APPLICATION PENDING.**

Phase 11.1 is complete for the requested repository/SQL scope. You can later create dedicated WRS staging/production Supabase projects, apply all 25 migrations in timestamp order and run the verification SQL without redesigning the schema.

The following remain live/manual evidence rather than unfinished repository work:

1. create/select dedicated WRS staging and production Supabase projects;
2. apply the migration pack and verification SQL to those projects;
3. connect/create the WRS Vercel environments;
4. configure real environment-specific credentials;
5. pass the staging live preflight/API/browser evidence.

Those items still prevent final production GO, but they do **not** block continuing the Plan 11 repository-preparation loop.
