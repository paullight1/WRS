# WRS no-upgrade production design

**Status:** Draft for user review
**Date:** 2026-10-04

## Intent and constraints

Launch WRS using the resources already connected to this workspace, without upgrading the WRS Supabase organization or creating extra Supabase organizations to evade the two-active-project Free-plan limit. Preserve unrelated Vercel projects. Keep all production credentials server-side and do not place customer data in source control.

The desired outcome is a real WRS production deployment with isolated staging, explicit release gates, and the strongest recovery measures available without a Supabase plan change. Supabase Free availability and recovery limits remain operational risks; the release must not be described as fully production-ready until the owners accept or close those risks.

## Current resource inventory

- WRS Supabase organization `nqvragetcfkactufewek` is on Free, in `eu-central-1`, with its two active projects:
  - `zaujrbcvgargyabebjyj` (`wrs-staging`): PostgreSQL 17.11, 33 applied migrations.
  - `bymiojfdlkspawvakrif` (`My Project`): PostgreSQL 17.6, 31 applied migrations.
- The checked-out repository currently has 34 migration files. The current staging project is missing `20261003182654_admin_operator_role_management`; the development project is also missing later mining migrations. No migration is to be applied to either project as part of this design step.
- Supabase Free permits two active projects across organizations owned or administered by the account. Free projects can pause after low activity and do not receive automatic daily database backups. Manual exports and off-site retention are therefore required for recovery planning.
- The connected Vercel team has 24 existing projects and no WRS project. A new, separately named WRS project must be created; no existing project is to be repurposed. The Vercel team's plan is not visible in the current connector response. Vercel Hobby is limited to personal, non-commercial use, so the WRS project must not be hosted there if WRS is operated commercially.
- WRS backend code uses Supabase Auth, Postgres REST/RPC, and private Storage. Replacing Supabase would require a broader identity, storage, database API, and migration rewrite, so provider migration is outside this design.

## Proposed topology

Use exactly the two existing WRS Supabase projects, without changing the subscription:

1. Keep `zaujrbcvgargyabebjyj` as the production database after staging validation, data review, migration reconciliation, security review, and recovery preparation pass.
2. Bring `bymiojfdlkspawvakrif` to the current schema and use it as the staging database. It must contain synthetic test identities and data only. Confirm existing data ownership and disposition before any cleanup; do not delete or overwrite unknown records.
3. Create a dedicated Vercel project linked to `paullight1/WRS` in the existing connected team, subject to confirming that the team's plan and usage terms permit WRS's commercial workload. Leave all other projects untouched.
4. Scope Vercel Production variables to the production Supabase project and Vercel Preview variables to staging. The browser receives only the publishable Supabase key. Supabase secret/service-role credentials, database credentials, payment secrets, scanner credentials, and worker secrets stay in server-only encrypted secret stores.

The local runtime default remains fail-closed staging. Production mode must be selected explicitly and must reject incomplete configuration. Preview deployments must never use production credentials or production customer data.

## Migration and release sequence

1. Freeze a reviewed release candidate and compare the exact repository migration set with both project histories.
2. Review the new admin-role migration and apply all missing migrations to `My Project` first. Run schema verification and the staging integration/security drills there. Resolve the PostgreSQL minor-version difference or record a successful compatibility check.
3. Review the current `wrs-staging` project for any test data and configuration. Establish an encrypted backup and prove restoration to the staging project before it is considered a production candidate.
4. Apply and verify the reviewed migrations on `wrs-staging`. Do not promote if migration history, schema checks, security review, or backup recovery differs from the candidate evidence.
5. Create the dedicated Vercel WRS project and set Preview to the staging project and Production to `wrs-staging`. Deploy the frozen candidate only after the Vercel plan, Git branch protections, required environment variables, and domain are confirmed.
6. Complete payment, privacy-storage scanning/deletion, alert-routing, accessibility, performance, legal/privacy, and launch-owner gates. Promote the candidate only when all required evidence is signed and the release gate returns GO.
7. Roll back application deployments through Vercel. Database changes must remain backward-compatible; data rollback requires restoring the verified backup and following the recovery runbook.

## Recovery and Free-tier operating policy

- Use encrypted logical PostgreSQL exports outside the application repository. GitHub Actions artifacts may serve as a short-retention transport only after repository access, artifact quotas, retention, encryption-key custody, and restore procedures are confirmed. They are not considered an independent disaster-recovery copy because they share the code-hosting account and have finite retention/storage quotas.
- Include Supabase Storage object exports as well as the database dump; a database dump alone does not recover private uploaded files.
- Alert on failed/missed backups, backup size or quota limits, project pause/restriction, authentication failure, payment/reconciliation failures, scanner/deletion failures, and availability incidents.
- Before launch, prove restoration of a synthetic-only backup into staging and retain timestamps, restore duration, integrity comparison, and operator identity.
- After real customer data exists, never restore a production backup into staging. Run production-data recovery drills only in an isolated, access-controlled temporary target approved for that data. If no compliant target is available using existing resources, customer-data launch remains NO-GO.
- Define acceptable recovery-point and recovery-time objectives with the owners before production GO.
- Do not rely on artificial traffic as a substitute for the Free-plan availability guarantee. Monitor project state and maintain a documented owner procedure to resume a paused project.
- If no secure off-site backup destination and restore drill can be established from available resources, the release remains NO-GO for customer balances, payments, or sensitive-data workflows.

## Security and data controls

- Review the two anon-executable `SECURITY DEFINER` verification RPCs identified by Supabase advisors; confirm their public projection is intentionally minimal and test unauthorized inputs before launch.
- Keep all user-owned and financial operations behind existing server authorization, rate limits, RLS, and idempotency controls. No direct browser access to service-role credentials.
- Keep payment provider in test mode until signed webhooks, retries, duplicate/delayed callbacks, refunds/reversals, entitlements, and ledger reconciliation pass in staging.
- Keep private uploads disabled until signed upload grants, real malware scanning, private object access, and completed deletion-worker behavior are demonstrated.
- Use synthetic identities and financial data in staging. Do not copy production rows into the staging project.

## Acceptance criteria

- Both existing Supabase projects have an agreed role, region, Postgres compatibility result, and exact migration history matching the release candidate.
- A dedicated WRS Vercel project is connected to the intended WRS repository and its plan permits commercial use.
- Production and Preview variables are separated; no server secret is exposed in built client assets or source control.
- An encrypted database-and-storage backup is available outside the application repo, and its restore has passed the integrity comparison with measured RPO/RTO.
- All required Plan 11 release evidence is PASS, including independent payment, data-handling, alerting, browser, rollback, governance, legal/privacy, accessibility, and named-owner gates.
- The launch evaluator returns GO. If Free-tier availability or recovery requirements cannot meet the agreed RPO/RTO, document the limitation and keep launch NO-GO rather than relabeling a pilot as full production readiness.

## Open items before implementation

1. Confirm the connected Vercel team's plan and that it can host a commercial WRS service.
2. Confirm an encrypted off-site backup destination and the owner-controlled database/storage credentials needed by its scheduled job.
3. Confirm whether `My Project` contains any real or user-owned data before it becomes the staging environment.
4. Supply production domain/DNS access and provider credentials through their secret managers, never in chat.

## References

- [Supabase billing and Free project limits](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [GitHub Actions billing and artifact storage](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub Actions artifact retention](https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs)
