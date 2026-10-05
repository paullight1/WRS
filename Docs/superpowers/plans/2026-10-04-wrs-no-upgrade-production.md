# WRS No-Upgrade Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare WRS for a controlled production launch using its two existing Supabase Free projects and one separate WRS Vercel project, without upgrading Supabase.

**Architecture:** Keep `zaujrbcvgargyabebjyj` as the eventual production database and reconcile `bymiojfdlkspawvakrif` as staging. Link a new WRS Vercel project to the WRS GitHub repository with isolated Preview and Production environments. Add encrypted database and private-Storage recovery evidence using an owner-approved available destination; never restore production customer data into the persistent staging project.

**Tech Stack:** Node 24, React/Vite, Vercel projects and environment variables, Supabase Auth/Postgres REST/RPC/Storage, PostgreSQL 17, GitHub Actions, Plan 11 scripts and evidence matrix.

**Spec:** `Docs/superpowers/specs/2026-10-04-wrs-no-upgrade-production-design.md`

## Global Constraints

- Do not upgrade the WRS Supabase organization or create extra organizations to evade the two-active-project Free-plan limit.
- Use only the two existing WRS projects: production `zaujrbcvgargyabebjyj`; staging `bymiojfdlkspawvakrif` after data disposition and migration reconciliation.
- Do not delete, overwrite, or copy unknown/user-owned data; staging must use synthetic identities and financial data only.
- Preserve unrelated Vercel projects; create a separate WRS project only if the connected Vercel team's plan and usage terms permit WRS's commercial workload.
- Scope Vercel Preview variables to staging and Production variables to production; never put service-role, database, payment, scanner, or worker secrets in `VITE_` variables.
- Production mode must be explicit and reject incomplete configuration; the local runtime default remains fail-closed staging.
- Do not force a breaking dependency major upgrade to clear an audit finding; any such UI/toolchain migration needs its own reviewed plan.
- Keep payment and sensitive-data workflows disabled until their respective staging drills and provider credentials pass.
- Never mark a Plan 11 or human approval gate PASS without evidence for the exact release candidate and its named owner.
- If no secure off-site backup and isolated restore process meets owner-approved RPO/RTO, keep launch NO-GO for balances, payments, and sensitive-data workflows.
- Do not use artificial traffic as a substitute for an availability guarantee; monitor project pause/restriction and document the named owner's resume procedure.
- Preserve unrelated and pre-existing worktree changes; stage only files owned by this plan.

## Review Focus

- **Wrong project or environment target:** audit, migration, or backup must refuse a Supabase URL/ref mismatch; cover in `tests/plan11/supabaseLiveInfrastructureContract.test.mjs` and `tests/plan11/freeTierBackupContract.test.mjs`.
- **Migration-history drift:** applied timestamps differ from repository filenames, so compare exact migration names and report missing/extra names; cover in `tests/plan11/liveMigrationSetContract.test.mjs`.
- **Production secret exposure:** Preview and browser bundles must not receive Production-only service-role, database, or payment secrets; cover in `tests/plan11/productionEnvironmentIsolationContract.test.mjs` and `tests/plan1/runtimeConfig.test.mjs`.
- **Incomplete or oversized backup:** a failed dump, missing Storage object, encryption error, or full destination must not produce a PASS; cover in `tests/plan11/freeTierBackupContract.test.mjs`.
- **Real data in staging or a mismatched restore:** staging stays synthetic-only and restore comparison uses the frozen synthetic identity before launch; cover in `tests/plan11/providerRecoveryContract.test.mjs` and require owner data-disposition evidence.

---

### Task 1: Make migration and Supabase audit gates match both Free projects

**Files:**
- Modify: `.github/workflows/plan11-database-gate.yml`
- Modify: `.github/workflows/plan11-live-activation-gate.yml`
- Modify: `scripts/plan11/supabase-live-audit.mjs`
- Modify: `tests/plan11/supabaseLiveInfrastructureContract.test.mjs`
- Create: `tests/plan11/liveMigrationSetContract.test.mjs`

**Interfaces:**
- Audit inputs: `WRS_SUPABASE_AUDIT_TARGET` (`staging` or `production`), `WRS_SUPABASE_AUDIT_PROJECT_REF`, `WRS_SUPABASE_AUDIT_URL`, `WRS_SUPABASE_AUDIT_PUBLISHABLE_KEY`, and secret `WRS_SUPABASE_AUDIT_DB_URL`.
- Project-ref map: staging `bymiojfdlkspawvakrif`; production `zaujrbcvgargyabebjyj`.
- Audit output: target, project ref, repository migration names/count, applied migration names/count, PostgreSQL version, Auth health, critical-table RLS, and private-bucket state. It emits no credentials or row data.

- [ ] **Step 1: Add failing migration-parity tests** asserting local filenames are sorted, remote names match filename suffixes regardless of applied timestamps, and missing or unexpected migration names are rejected.
- [ ] **Step 2: Run focused contracts** with `node --test tests/plan11/supabaseLiveInfrastructureContract.test.mjs tests/plan11/liveMigrationSetContract.test.mjs`; confirm staging-only env names and the hard-coded migration count fail the new contract.
- [ ] **Step 3: Generalize `supabase-live-audit.mjs`** to audit one declared target, verify the URL hostname matches its project-ref map, and compare exact migration-name sets instead of connector-assigned timestamps.
- [ ] **Step 4: Update database CI** to apply every `supabase/migrations/*.sql` file and assert the number applied matches the discovered repository file count; remove the stale hard-coded `25`. Update the live activation workflow to run the audit against one protected GitHub environment at a time.
- [ ] **Step 5: Rerun focused contracts** and verify wrong refs, missing/extra migrations, unhealthy Auth, missing RLS, or a public/misconfigured `wrs-private-data` bucket fail closed.
- [ ] **Step 6: Run the Plan 11 Activation Database Gate workflow** through its pull-request trigger and confirm all 34 migrations plus each Plan 11 verification SQL file complete successfully on PostgreSQL 17.

### Task 2: Reconcile project roles and migration histories

**Files:**
- Modify only after external verification: `Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json`
- Modify only after external verification: `Docs/production-readiness/11-live-activation/PHASE-11.1-INFRASTRUCTURE.md`
- Verify: `supabase/migrations/*.sql`
- Verify: `supabase/verification/plan11_post_migration_checks.sql`

**Interfaces:**
- Apply each migration by exact project ID and migration name through the Supabase migration tool; never replay an already-applied migration.
- Expected missing migrations on `wrs-staging`: `admin_operator_role_management`.
- Expected missing migrations on `My Project`: `mining_one_free_robot_slot`, `mining_robot_slots_by_rbc`, and `admin_operator_role_management`.
- PASS evidence names the exact project ref, migration-name set, verification output, timestamp, and candidate SHA.

- [ ] **Step 1: Read metadata and aggregate data-disposition evidence** for `My Project`; do not clean or repurpose it until its owner confirms whether any real user records must be preserved.
- [ ] **Step 2: On `My Project` only, review and apply its three missing migrations in repository order**; do not modify user records or production configuration.
- [ ] **Step 3: Run post-migration SQL and the generalized live audit against `My Project`**; record PostgreSQL 17.6 compatibility and fail on any migration/schema difference.
- [ ] **Step 4: On `wrs-staging` only, review and apply `admin_operator_role_management`** after the isolated database gate passes; this becomes the eventual production database only after all release gates pass.
- [ ] **Step 5: Run post-migration SQL and live audit against `wrs-staging`**; verify all 34 migration names, PostgreSQL 17.11, Auth health, critical-table RLS, and private Storage state.
- [ ] **Step 6: Record verified project roles and migration results** in Phase 11.1 and the evidence matrix; keep status blocked until recovery, security, environment, and launch evidence pass.

### Task 3: Build encrypted Free-tier database and Storage recovery

**Files:**
- Create: `scripts/plan11/free-tier-backup.mjs`
- Create: `.github/workflows/plan11-free-tier-backup.yml`
- Create: `tests/plan11/freeTierBackupContract.test.mjs`
- Modify: `Docs/runbooks/LIVE_RECOVERY_ROLLBACK.md`
- Modify only after a real restore: `Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json`

**Interfaces:**
- Inputs: `WRS_BACKUP_PROJECT_REF`, `WRS_BACKUP_DATABASE_URL`, `WRS_BACKUP_SUPABASE_URL`, `WRS_BACKUP_SUPABASE_SECRET_KEY`, and public encryption recipient `WRS_BACKUP_AGE_RECIPIENT`.
- The production backup job accepts only ref `zaujrbcvgargyabebjyj` and runs only from the protected default branch in a `production-backup` GitHub environment. That environment holds secrets but has no per-run reviewer gate, so nightly backup runs can execute automatically after repository branch protection is proven.
- An archive contains a PostgreSQL custom-format dump, all objects from `wrs-private-data`, and a manifest of project ref, release SHA, object count, dump/object hashes, creation time, and archive size. Logs omit object names, row data, and credentials.
- The owner must confirm an encrypted off-site destination, access policy, retention, capacity, and restore target. GitHub Actions artifacts may be a short-retention encrypted transport after quota and privacy checks; they are not an independent disaster-recovery copy.
- Before first customer data, restore the synthetic-only backup into `My Project`. After customer data exists, use only an approved, isolated temporary restore target; never restore production data into `My Project`.

- [ ] **Step 1: Write backup contract tests** for exact production-ref enforcement, missing secrets, paginated object listing, hashes, encryption failure, archive-size limits, and missing/partial objects.
- [ ] **Step 2: Run `node --test tests/plan11/freeTierBackupContract.test.mjs`** and confirm contracts fail before implementation.
- [ ] **Step 3: Implement the database and Storage export** in `free-tier-backup.mjs`; use PostgreSQL 17 custom-format dump, paginate the private bucket, hash each object, and produce a manifest without logging personal data.
- [ ] **Step 4: Encrypt the complete archive client-side with `age`** using only the configured public recipient. Validate target ref and archive contents before success, and remove plaintext temporary files on success or failure.
- [ ] **Step 5: Add scheduled and manual GitHub Actions runs** with least-privilege permissions, no pull-request trigger, default-branch-only execution, short explicit artifact retention, an archive quota guard, and failure alerting. Restrict backup secrets to the `production-backup` environment and enable the schedule only after branch protection passes. Do not put dumps or credentials in Git.
- [ ] **Step 6: Run focused contracts and a synthetic-only backup/restore drill into `My Project` before production activation**; verify only ciphertext is retained and restored schema, Storage objects, and recovery fingerprint match.
- [ ] **Step 7: Define the post-launch isolated restore target with the owner**; prove the encrypted archive can be restored there without placing production records in staging. If no approved target is available, keep customer-data launch NO-GO.
- [ ] **Step 8: Update recovery runbook and evidence** only with measured restore duration, recovery point, integrity results, destination retention, and named operator.

### Task 4: Provision isolated WRS hosting and production configuration

**Files:**
- Modify: `.env.live.example`
- Modify: `src/lib/runtimeConfig.js` only if the environment contract tests require changes
- Modify: `tests/plan1/runtimeConfig.test.mjs`
- Create: `tests/plan11/productionEnvironmentIsolationContract.test.mjs`
- Verify: `vercel.json`

**Interfaces:**
- New project: `wrs-production`, linked to `paullight1/WRS` in team `team_0m722looHPylaECSCKh2f6oa`; do not reuse an existing Vercel project.
- Preview targets `bymiojfdlkspawvakrif`; Production targets `zaujrbcvgargyabebjyj`.
- Public build variables: `VITE_WRS_MODE`, `VITE_WRS_AUTHORITY_URL`, `VITE_PUBLIC_SUPABASE_URL`, `VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and explicit `VITE_WRS_*_SERVICE` flags.
- Server-only values: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, payment keys, private-storage configuration, and worker secrets listed in `.env.live.example`.

- [ ] **Step 1: Add environment-isolation tests** proving Production rejects missing config, Preview uses only staging, Production uses only production, test Paystack keys are rejected in Production, and no secret appears in built browser assets.
- [ ] **Step 2: Run focused config contracts** with `node --test tests/plan1/runtimeConfig.test.mjs tests/plan11/productionEnvironmentIsolationContract.test.mjs`; verify missing, mixed, and secret-exposure cases fail.
- [ ] **Step 3: Update `.env.live.example` and runtime validation** with the exact environment contract and no real values; preserve default staging mode and require explicit production mode.
- [ ] **Step 4: Run focused config contracts, `npm run check:secrets`, `npm run typecheck`, and `npm run build`**; inspect built assets for absence of service-role, database, payment, scanner, and worker secrets.
- [ ] **Step 5: Confirm the connected Vercel team's plan permits WRS commercial use**; if it is Hobby, stop before project creation or deployment and keep the infrastructure gate blocked.
- [ ] **Step 6: Create a separate `wrs-production` project linked to `paullight1/WRS`** after the release branch is clean and hosting plan confirmed. Keep its Production alias inactive.
- [ ] **Step 7: Configure Preview variables** with owner-supplied staging Supabase and Paystack test values in Vercel's encrypted settings; verify all Preview hosts and callback URLs use staging.
- [ ] **Step 8: Configure Production variables** with owner-supplied production Supabase and Paystack live values in Vercel's encrypted settings; verify no value is shared with Preview and no server credential has a `VITE_` prefix.
- [ ] **Step 9: Attach and verify the WRS domain** after the owner supplies DNS access; retain the CSP, HSTS, and security headers in `vercel.json`.
- [ ] **Step 10: Run `npm run plan11:staging-probe`, `npm run plan11:staging-e2e`, and the hosted Preview browser journey** against the staging alias. Do not promote to Production in this task.

### Task 5: Close Plan 11 evidence and release only on GO

**Files:**
- Modify only from verified evidence: `Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json`
- Modify only from verified evidence: relevant `Docs/production-readiness/11-live-activation/PHASE-11.*.md`
- Verify: `scripts/plan11/*.mjs`
- Verify: `Docs/runbooks/LIVE_RECOVERY_ROLLBACK.md`
- Verify: `supabase/migrations/20261003182654_admin_operator_role_management.sql`

**Interfaces:**
- `npm run plan11:status` reports blockers; `npm run plan11:gate` passes only when every required gate passes for the frozen candidate.
- Human approval evidence names the approver and timestamp for accessibility, legal/privacy, incident, release, and rollback ownership.
- Existing probes cover payment/payout, sensitive-data staging, alert routing, mobile vitals, provider recovery comparison, GitHub governance, and Vercel staging rollback.

- [ ] **Step 1: Review the two anon-executable verification RPCs** from Supabase advisor output; verify minimal public projections and unauthorized-input behavior, and keep the gate blocked until signed security review.
- [ ] **Step 2: Run the Paystack payment sandbox probe** with owner-provided test credentials using `node scripts/plan11/paystack-sandbox-probe.mjs`; retain signed-webhook, duplicate/delayed callback, refund, entitlement, and ledger reconciliation evidence.
- [ ] **Step 3: Run the Paystack payout sandbox probe** with owner-provided test credentials using `node scripts/plan11/paystack-payout-probe.mjs`; retain KYC, reversal, and ledger reconciliation evidence.
- [ ] **Step 4: Run the sensitive-data staging drill** with a verified synthetic identity using `node scripts/plan11/sensitive-data-staging-drill.mjs`; require private Storage, real malware scanning, deletion-worker completion, and no customer data.
- [ ] **Step 5: Run alert routing** with `node scripts/plan11/alert-routing-drill.mjs`; capture incident IDs, acknowledgement times, and named responders for every required incident type. Confirm project-pause/restriction failures trigger the documented owner resume procedure; do not add artificial keepalive traffic.
- [ ] **Step 6: Run staging mobile vitals** with `npm run plan11:staging-lab-vitals`; record candidate URL and measured LCP/CLS, then attach representative INP evidence.
- [ ] **Step 7: Complete manual accessibility review** for keyboard, zoom, reflow, and assistive technology; capture named reviewer and findings.
- [ ] **Step 8: Run GitHub governance probe** with `node scripts/plan11/github-governance-probe.mjs`; require main protection, reviews, stale-review dismissal, admin enforcement, and required checks.
- [ ] **Step 9: Run the Vercel staging rollback drill** with `node scripts/plan11/vercel-staging-rollback-drill.mjs`; verify rollback and re-promotion of the frozen candidate.
- [ ] **Step 10: Obtain legal/privacy, incident, release, and rollback owner approvals** and attach each named approval to the exact candidate.
- [ ] **Step 11: Run `npm run test:contracts`, `npm run test:unit`, `npm run typecheck`, `npm run build`, `npm run check:secrets`, `npm run check:bundle-budget`, and `npm run audit`**; resolve release-blocking failures before candidate freeze. The current lockfile has five high findings in Tailwind 3's dependency tree; do not use `npm audit fix --force`. If Tailwind 4 is required, keep NO-GO and write a separately reviewed UI migration plan.
- [ ] **Step 12: Update evidence only for complete, timestamped, candidate-matched results**, including the current Vercel finding (24 unrelated team projects and no WRS project); run `npm run plan11:status` and confirm all outstanding blockers are accurate.
- [ ] **Step 13: Run `npm run plan11:gate` and the strict release-candidate workflow**; expect NO-GO while any external or human gate is pending.
- [ ] **Step 14: Promote the frozen candidate to the Production alias only after the evaluator returns GO**; verify Production Auth, critical APIs, private Storage, health alerts, and rollback target, then record the candidate SHA and named release owner.

## Dependency order

1. Task 1 establishes reliable migration/audit contracts.
2. Task 2 reconciles the staging project before it can safely become the production target; it depends on Task 1.
3. Task 3 proves synthetic-only prelaunch recovery and defines a compliant post-launch restore target; it depends on Task 2.
4. Task 4 creates isolated hosting after database roles and release branch are known; its Production alias stays inactive through staging validation.
5. Task 5 depends on all prior tasks and external owners; it alone authorizes production promotion.

Keep launch NO-GO if the Vercel plan is ineligible for commercial use, staging data cannot be safely dispositioned, an encrypted backup or isolated restore target is unavailable, or any required operator/human evidence is missing.
