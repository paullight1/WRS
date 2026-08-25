# WRS Supabase Migration Guide

This directory is the authoritative SQL installation pack for WRS. Apply the migrations to a **dedicated WRS Supabase project** in the exact timestamp order below. Do not apply them to another product's database.

## Project prerequisites

Before running SQL:

- Use PostgreSQL 17 on Supabase.
- Enable Supabase Auth and Storage for the project.
- Start with a new/empty WRS project where possible.
- Keep the Supabase secret/service-role key server-side only.
- Use separate Supabase projects for staging and production.
- Take a provider backup/PITR checkpoint before applying migrations to an existing WRS environment.

The SQL assumes Supabase-provided schemas/roles exist, including `auth`, `storage`, `anon`, `authenticated`, and `service_role`.

## Required migration order

Run **all 25 files** below in order. Do not skip hardening/fix migrations; later files intentionally correct or strengthen earlier definitions.

| # | Migration | Purpose |
|---:|---|---|
| 1 | `20260821030000_plan3_identity.sql` | Identity/profile/session/role/security base schema and RLS. |
| 2 | `20260821031000_plan3_identity_hardening.sql` | Identity privilege, audit and security hardening. |
| 3 | `20260821033000_plan3_rate_limits.sql` | Database-backed distributed auth/API rate limits. |
| 4 | `20260821034000_plan3_auth_atomicity.sql` | Atomic authentication/verification operations. |
| 5 | `20260821034100_plan3_security_state_uniqueness.sql` | Security-state uniqueness/idempotency constraints. |
| 6 | `20260821034200_plan3_phone_constraint_fix.sql` | Portable E.164-style phone validation correction. |
| 7 | `20260821040000_plan4_robot_domain.sql` | Robot ownership, packages, capabilities, configuration and progression base schema. |
| 8 | `20260821041000_plan4_robot_functions.sql` | Atomic onboarding/configuration/robot service functions. |
| 9 | `20260821042000_plan4_xp_projection_hardening.sql` | XP idempotency, reversals and passport progression projection. |
| 10 | `20260821043000_plan4_passport_projection.sql` | Authoritative/private and privacy-safe public robot passport projections. |
| 11 | `20260822050000_plan5_financial_ledger.sql` | Package prices, payment intents, double-entry ledger, wallet and withdrawal base. |
| 12 | `20260822051000_plan5_finance_reversals.sql` | Refund, reversal and compensating financial journals. |
| 13 | `20260822052000_plan5_idempotency_isolation.sql` | Financial idempotency-key isolation and collision protection. |
| 14 | `20260822053000_plan5_reversal_reference_fix.sql` | Provider reversal/reference correctness hardening. |
| 15 | `20260822060000_plan6_data_privacy.sql` | Consent, private data assets, submissions, quality, datasets/licensing and export base. |
| 16 | `20260822061000_plan6_deletion_distribution_hardening.sql` | Privacy deletion and dataset-revenue distribution hardening. |
| 17 | `20260822062000_plan6_data_tasks.sql` | Authoritative AI/data contribution task definitions. |
| 18 | `20260822063000_plan6_deletion_queue.sql` | Durable, retryable, grace-period-aware sensitive-data deletion queue. |
| 19 | `20260822070000_plan7_deployment_engine.sql` | Deployment opportunities, eligibility, contracts, lifecycle, evidence and settlement base. |
| 20 | `20260822071000_plan7_deployment_hardening.sql` | Deployment concurrency/idempotency/ownership and settlement hardening. |
| 21 | `20260822080000_plan8_ecosystem.sql` | Marketplace, reward points/codes/boosts, academy, community and referrals base. |
| 22 | `20260822081000_plan8_ecosystem_hardening.sql` | Ecosystem package compatibility and trust-boundary hardening. |
| 23 | `20260822082000_plan8_referral_code_portability.sql` | Portable bounded referral-code generation under hardened search paths. |
| 24 | `20260822090000_plan9_account_operations.sql` | Persistent settings, account deletion, support/KB, operator RBAC and operations audit. |
| 25 | `20260825010000_plan11_storage_activation.sql` | Creates/locks down the private WRS Storage bucket used by data and support uploads. |

## Recommended application methods

### Supabase CLI

With a dedicated project linked, use the Supabase migration workflow so the platform records migration history. Apply to staging first, run verification, then repeat against production only after staging evidence is accepted.

### Supabase SQL Editor

If you apply manually in the dashboard, open each file in the order above and execute it completely before moving to the next. Record the filename, project ref, UTC timestamp and operator in your release evidence because manual SQL Editor execution does not give you the same repository-linked migration workflow.

## Post-migration verification

After file 25, run:

`supabase/verification/plan11_post_migration_checks.sql`

It is read-only and raises an exception if critical relations/routines/RLS/privileges or the private storage bucket are missing or unsafe.

For deeper non-production verification, the repository also contains synthetic invariant suites under `tests/database/` for Plans 3–9. Those tests intentionally create synthetic rows and should **not** be run casually against a production database.

## Storage rule

Both staging and production should use the logical bucket name:

`wrs-private-data`

Because staging and production are separate Supabase projects, the same bucket name does not mix data between environments. `WRS_DATA_BUCKET` should therefore be set to `wrs-private-data` in both environments.

The bucket remains private. The application server uses the server-side Supabase secret/service-role key to create short-lived signed upload/download grants. Do not add broad `anon` or `authenticated` `storage.objects` policies for this bucket.

## Auth configuration not represented by SQL

The database migrations cannot configure every hosted Supabase Auth provider setting. When you create the projects later, configure the required email/phone delivery providers, allowed redirect URLs, MFA settings and OAuth providers separately. Keep OAuth disabled in WRS until provider credentials and callback URLs are verified.

## Rollback policy

These migrations are forward-only production migrations. Do not attempt ad-hoc down migrations for financial, identity, consent, audit or deployment history. If a production migration fails after partial application:

1. stop application promotion;
2. preserve logs/evidence;
3. restore from the provider backup/PITR checkpoint when rollback is required;
4. fix the migration forward in a new timestamped SQL file;
5. re-run the read-only verification SQL before resuming deployment.

Never rewrite a migration that has already been applied to a live WRS environment; add a new hardening/fix migration instead.
