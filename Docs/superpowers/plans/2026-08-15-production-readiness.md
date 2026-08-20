# WRS Public Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current controlled-beta/demo infrastructure with production-grade payments, entitlements, persistence, media handling, authentication, deployment operations, observability, and release controls.

**Architecture:** Keep the React/Vite client as a thin authenticated client. Move business truth into normalized PostgreSQL tables and transactional server repositories; use Supabase Auth, private Supabase Storage, signed provider webhooks, and background jobs for workflows that cannot complete safely inside an HTTP request. Keep the JSON adapter only for local development and isolated tests, never as a production fallback.

**Tech Stack:** React 18, Vite, Node.js 22+, Supabase Auth, Supabase PostgreSQL, Supabase Storage, `pg`, Paystack for Nigerian/local collection plus a Stripe-compatible provider adapter for supported international corridors, private object storage, a durable job runner/queue, OpenTelemetry-compatible metrics/traces, and GitHub Actions.

## Global Constraints

- Production runtime requires Node `>=22.0.0` and PostgreSQL; the JSON state adapter is development/test-only.
- A client payment success callback never activates a package; only a verified, replay-protected provider webhook may create or activate an entitlement.
- Public users cannot upload sensitive media to local disk or send base64 blobs through the API.
- Supabase authorization uses `app_metadata`/server-owned tables, never user-editable `user_metadata`.
- Every exposed Supabase table has RLS enabled, explicit grants, and owner/role policies tested against both allowed and denied users.
- Wallet balances are projections of an immutable, double-entry ledger; no request handler directly edits an available balance.
- Deployments remain unavailable to public users until a real provider, telemetry, safety, contract, and settlement path is certified. A simulation may remain behind an internal feature flag.
- Every externally retried mutation has an idempotency key, an audit record, and a deterministic state transition.
- No release proceeds while `npm audit --audit-level=high`, migration tests, critical end-to-end tests, or the production checklist fails.

## Release Tracks and Dependencies

The work is split into five independently reviewable tracks:

1. **Data and security foundation:** schema, RLS, normalized repositories, sessions, CSP, secrets.
2. **Commercial and money movement:** checkout, webhooks, entitlements, ledger, withdrawals, reconciliation.
3. **Contribution and media:** private uploads, scanning, review, retention, mining/reward evidence.
4. **Operational deployments:** dispatch, telemetry, safety gates, contracts, settlement.
5. **Delivery and operations:** background jobs, observability, CI/CD, backup/restore, launch controls.

Dependencies:

```text
Contract inventory
       ↓
Normalized schema + RLS ────────┬── Auth/session hardening
       ↓                        ├── Payment + entitlement flow
Data migration/cutover           ├── Media pipeline + review
                                ├── Ledger + withdrawals
                                └── Deployment operations
                                         ↓
                              Observability + CI + staging gates
```

---

## Task 1: Freeze the production domain contracts

**Files:**
- Modify: `Docs/production-readiness.md`
- Create: `Docs/architecture/production-domain-contracts.md`
- Create: `server/contracts/`
- Test: `server/tests/contracts.test.js`

**Interfaces:**
- Produces stable status enums and API payload contracts consumed by the payment, media, ledger, deployment, and client workstreams.
- Defines the canonical identifiers: `tenantId`, `userId`, `packageSlug`, `packageVersion`, `entitlementId`, `paymentAttemptId`, `ledgerEntryId`, `mediaObjectId`, and `deploymentId`.

- [ ] **Step 1: Inventory the existing JSON state.**

  List every collection used by `server/app.js`, `server/mining.js`, `server/rbc.js`, `server/training.js`, `server/dataTasks.js`, `server/deployments.js`, and `server/adminMining.js`. For each collection record its owner, lifecycle, money fields, audit fields, and existing idempotency behavior in `Docs/architecture/production-domain-contracts.md`.

- [ ] **Step 2: Define state machines before implementation.**

  Use these exact terminal states:

  ```text
  payment_attempt: created → pending → succeeded | failed | cancelled | expired
  entitlement: pending → active → expired | revoked | refunded
  media_object: pending → quarantined → approved | rejected | deleted
  review: queued → assigned → approved | rejected | needs_changes
  withdrawal: pending → approved | rejected → paid | failed | cancelled
  deployment: requested → approved → dispatched → active → paused → completed | cancelled | failed
  ```

  Every transition must record `actorType`, `actorId`, `reason`, `createdAt`, and an immutable audit event.

- [ ] **Step 3: Add contract tests for invalid transitions.**

  Assert that terminal states cannot transition again, ownership cannot change during an update, and a duplicate idempotency key returns the original result without creating another side effect.

- [ ] **Step 4: Run the contract tests.**

  Run: `node --test server/tests/contracts.test.js`

  Expected: all state-machine and idempotency cases pass before downstream work begins.

- [ ] **Step 5: Commit the contract baseline.**

  Run:

  ```bash
  git add Docs/production-readiness.md Docs/architecture/production-domain-contracts.md server/contracts server/tests/contracts.test.js
  git commit -m "docs: freeze production domain contracts"
  ```

---

## Task 2: Make normalized PostgreSQL the production source of truth

**Files:**
- Create: `supabase/migrations/202608150001_wrs_production_core.sql`
- Create: `supabase/migrations/202608150002_wrs_production_money.sql`
- Create: `supabase/migrations/202608150003_wrs_production_operations.sql`
- Create: `server/db/postgres-repositories/`
- Create: `server/db/postgres-transaction.js`
- Modify: `server/db/postgres-state-store.js`
- Modify: `server/store.js`
- Create: `server/scripts/import-wrs-state.js`
- Test: `server/tests/postgres-repositories.test.js`
- Test: `server/tests/migrations.test.js`

**Interfaces:**
- `createRepositories({ pool })` returns owner-scoped repositories for users, packages, entitlements, payments, media, reviews, ledger, withdrawals, deployments, audit events, notifications, and idempotency keys.
- Every repository method accepts a transaction client or executes through `withTransaction(callback)`; no business operation loads and rewrites one JSON document.
- `createPostgresStateStore` is retained only for a local compatibility mode and must throw when `NODE_ENV=production`.

- [ ] **Step 1: Create the relational tables with constraints.**

  Add composite tenant/user foreign keys, unique keys for provider event IDs and idempotency keys, check constraints for money amounts and state values, indexes for owner/status queues, and timestamps with timezone. Include at minimum:

  ```text
  payment_attempts
  payment_provider_events
  entitlements
  wallet_accounts
  wallet_ledger_entries
  wallet_balance_snapshots
  media_objects
  media_access_audit
  review_tasks
  review_decisions
  notifications
  notification_reads
  deployment_runs
  deployment_telemetry
  deployment_safety_events
  deployment_contracts
  job_runs
  ```

  Reuse existing normalized tables from `supabase/migrations/` where their keys and constraints already match the contract; do not duplicate them inside `wrs_state`.

- [ ] **Step 2: Enable and test RLS.**

  Enable RLS on every table in the exposed schema. Use `TO authenticated` policies with `(select auth.uid()) = user_id` for owner rows. Use separate server/admin policies based on trusted `app_metadata` roles or server-only connections. Add both `USING` and `WITH CHECK` to update policies. Revoke public access from internal tables and grant only the roles required by the API.

- [ ] **Step 3: Implement repositories and transaction boundaries.**

  Replace calls that mutate `db.users`, `db.entitlements`, `db.miningAccounts`, `db.transactions`, `db.trainingSubmissions`, and deployment collections with repository calls. Money mutations must lock the account row, insert ledger entries, and update a balance projection in one transaction.

- [ ] **Step 4: Build the importer and reconciliation report.**

  `server/scripts/import-wrs-state.js` must read a JSON snapshot, insert records in dependency order, preserve original IDs where valid, emit a mapping file for rewritten IDs, and report orphaned or duplicate rows. It must fail closed on inconsistent money totals instead of guessing.

- [ ] **Step 5: Add a dual-read verification mode.**

  In staging only, read the normalized repository and JSON snapshot for a sampled set of users, compare canonicalized payloads, and emit differences. Do not enable dual writes indefinitely; use it only to validate cutover.

- [ ] **Step 6: Test migrations and concurrency.**

  Run the migrations against a clean local Supabase/Postgres instance, verify RLS with member A/member B/admin sessions, and run concurrent ledger/idempotency tests. The test must prove two concurrent writes cannot double-spend or duplicate a provider event.

- [ ] **Step 7: Cut over staging, then production.**

  Take a backup, import into staging, run reconciliation, switch the API to repositories, keep the JSON snapshot read-only for rollback, and only then remove JSON access from production configuration. Record the cutover timestamp and row counts in the release artifact.

- [ ] **Step 8: Run migration verification.**

  Run:

  ```bash
  supabase db reset
  npm run test:api
  node --test server/tests/migrations.test.js server/tests/postgres-repositories.test.js
  ```

  Expected: clean migration, RLS denial tests, concurrency tests, and all API tests pass.

---

## Task 3: Replace mock checkout with payment and entitlement activation

**Files:**
- Create: `server/payments/provider.js`
- Create: `server/payments/paystack-provider.js`
- Create: `server/payments/stripe-provider.js`
- Create: `server/payments/payment-service.js`
- Create: `server/payments/webhook-service.js`
- Modify: `server/app.js`
- Modify: `src/screens/Checkout.jsx`
- Modify: `src/screens/PaymentSuccess.jsx`
- Modify: `src/lib/api.js`
- Create: `src/lib/paymentsApi.js`
- Test: `server/tests/payments.test.js`
- Test: `server/tests/payment-webhooks.test.js`
- Test: `src/lib/paymentsApi.test.js`

**Interfaces:**
- `createPaymentAttempt({ userId, packageSlug, packageVersion, currency, promoCode })` returns `{ paymentAttemptId, provider, checkoutUrlOrClientSecret, expiresAt }`.
- `handleProviderWebhook({ provider, rawBody, signature, receivedAt })` verifies the signature over the raw body, deduplicates by provider event ID, and applies one transactionally safe state transition.
- `getEntitlement(userId)` returns the server-owned package, version, status, start/end dates, and source payment ID.

- [ ] **Step 1: Define the country/currency launch matrix.**

  Launch only the corridors the configured providers support. Use Paystack for approved Nigerian/local collection. Use Stripe for eligible international cards where the merchant account supports the country/currency. Every unsupported country or currency must be rejected server-side and hidden or marked unavailable client-side.

- [ ] **Step 2: Add payment-attempt creation.**

  Replace the mock package data in `Checkout.jsx` with `GET /api/v1/packages` and `POST /api/v1/payments/attempts`. The server calculates the amount from the package version and published pricing, validates promo codes server-side, creates a pending attempt, and returns provider checkout data. Never accept amount, package price, or entitlement status from the browser.

- [ ] **Step 3: Implement signed webhook handling.**

  Add provider-specific signature verification over the raw request body, timestamp/replay checks, provider-event uniqueness, and a dead-letter record for events that cannot be applied. Apply `succeeded`, `failed`, `refunded`, `chargeback`, and `cancelled` events inside a database transaction.

- [ ] **Step 4: Activate and revoke entitlements from webhooks.**

  A successful payment creates an immutable payment record and an `active` entitlement. A refund or chargeback creates a compensating ledger/audit record and changes the entitlement to `refunded` or `revoked`. The mining gate, package gates, and deployment gates read this entitlement table only.

- [ ] **Step 5: Add reconciliation.**

  Add a scheduled job that compares provider settlement events with local payment attempts, flags missing or mismatched events, and never silently changes a balance. Admins can resolve a mismatch only with a reason and audit record.

- [ ] **Step 6: Make checkout honest and resilient.**

  Replace “Payment provider unavailable” with real pending, redirect, success, failure, expiry, and support states. `PaymentSuccess.jsx` must poll or fetch the server payment attempt; it must not infer activation from a URL query parameter or client callback.

- [ ] **Step 7: Test adversarial payment cases.**

  Cover duplicate webhook delivery, invalid signatures, stale timestamps, wrong package price, replayed checkout success, refund after activation, provider timeout, unsupported country, and two concurrent attempts for the same user/package.

- [ ] **Step 8: Run payment verification.**

  Run: `node --test server/tests/payments.test.js server/tests/payment-webhooks.test.js src/lib/paymentsApi.test.js`

  Expected: no client-only activation path exists and every entitlement transition has a verified provider event or audited admin action.

---

## Task 4: Move sensitive uploads to a private, scanned media pipeline

**Files:**
- Create: `server/media/media-service.js`
- Create: `server/media/upload-policy.js`
- Create: `server/media/scanner.js`
- Create: `server/media/retention-job.js`
- Modify: `server/training.js`
- Modify: `server/app.js`
- Modify: `src/screens/TrainingModule.jsx`
- Modify: `src/lib/api.js`
- Create: `src/lib/mediaApi.js`
- Create: `supabase/migrations/202608150004_wrs_private_media.sql`
- Test: `server/tests/media-security.test.js`
- Test: `server/tests/media-retention.test.js`

**Interfaces:**
- `createUploadIntent({ userId, moduleId, kind, contentType, byteSize, checksum, consentId })` returns a short-lived signed upload URL and `mediaObjectId`.
- `completeUpload({ userId, mediaObjectId, checksum })` verifies object existence and checksum before queueing scanning.
- `getMediaStatus(userId, mediaObjectId)` exposes only owner-scoped status and safe metadata.

- [ ] **Step 1: Create private buckets and RLS/storage policies.**

  Add private buckets for quarantine and approved media. Allow uploads only to owner-scoped paths. Do not grant public object reads. Signed download URLs must expire quickly and every access writes `media_access_audit`.

- [ ] **Step 2: Replace base64 upload requests.**

  Change `TrainingModule.jsx` to request an upload intent, stream the file directly to private storage, call completion with a checksum, and show `uploading`, `scanning`, `approved`, `rejected`, and `needs_changes` states. Remove `contentBase64` from the production API contract.

- [ ] **Step 3: Validate bytes, not only client MIME.**

  Enforce an allowlist for module kind, size, extension, and detected magic bytes. Reject mismatches. Treat client MIME as a hint only. Reject path traversal, oversized metadata, malformed checksums, and abandoned upload intents.

- [ ] **Step 4: Add malware/content scanning.**

  Queue quarantine objects for a malware scanner. Store scanner version, result, timestamp, and failure reason. Only approved objects can become contribution evidence. Scanner errors keep the object quarantined; they never fail open.

- [ ] **Step 5: Add consent, deletion, and retention.**

  Store the consent version and timestamp with each media object. Add owner deletion/export flows, retention expiry jobs, legal-hold support, and an audit trail for reads, downloads, deletion, and moderator access.

- [ ] **Step 6: Test media abuse cases.**

  Cover MIME spoofing, magic-byte mismatch, oversized files, malformed base64 sent to the legacy endpoint, cross-user signed URL access, scanner failure, expired upload intent, deletion, retention, and access auditing.

- [ ] **Step 7: Remove the legacy local object path.**

  Keep the local disk implementation only under an explicit test adapter. Production startup must fail if the private storage/scanner configuration is missing.

---

## Task 5: Harden authentication and browser session security

**Files:**
- Modify: `src/lib/api.js`
- Modify: `src/lib/auth.js`
- Modify: `src/components/AuthProvider.jsx`
- Modify: `server/supabaseAuth.js`
- Modify: `server/security.js`
- Modify: `index.html`
- Modify: `vite.config.js`
- Create: `server/session-service.js`
- Test: `server/tests/session-security.test.js`
- Test: `scripts/security-headers.test.js`

**Interfaces:**
- `createSessionFromSupabaseIdentity()` creates a short-lived server session represented by an `HttpOnly`, `Secure`, `SameSite=Lax` cookie in production.
- `requireAuthenticatedRequest()` validates the current session and revocation state for every protected API request.

- [ ] **Step 1: Remove production bearer tokens from localStorage.**

  Use Supabase Auth for identity and a server-managed session cookie for the API. Keep the current `wrs.accessToken` path only in an explicitly non-production compatibility mode with a startup warning. Do not expose refresh tokens to application JavaScript.

- [ ] **Step 2: Add session rotation and revocation.**

  Rotate the session on login and privilege changes, revoke sessions on logout/password reset/account deletion, enforce idle/absolute expiry, and reject revoked session IDs even when a JWT has not expired.

- [ ] **Step 3: Harden authorization.**

  Keep role checks in trusted `app_metadata` or server-owned role tables. Do not use `user_metadata` for admin/reviewer decisions. Add tests proving a member cannot self-promote through metadata or request another user’s rows.

- [ ] **Step 4: Add a real CSP and security headers.**

  Define `Content-Security-Policy` with explicit `default-src`, `script-src`, `connect-src`, `img-src`, `media-src`, `font-src`, `worker-src`, `frame-ancestors`, and `object-src 'none'` directives compatible with Supabase, Vite assets, and Three.js. Add `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, and production TLS-aware cookie settings. Do not enable HSTS until the production domain and TLS redirect are verified.

- [ ] **Step 5: Add CSRF protection for cookie-authenticated mutations.**

  Require an origin check plus a CSRF token/header on state-changing requests. Keep webhook endpoints on signature verification instead of browser CSRF.

- [ ] **Step 6: Test XSS/session abuse.**

  Verify tokens are absent from localStorage, cookies have the required flags, CSP blocks inline/script injection, revoked sessions fail, CSRF-less mutations fail, and metadata-based privilege escalation is denied.

---

## Task 6: Build the immutable wallet, review, payout, and settlement path

**Files:**
- Create: `server/ledger/ledger-service.js`
- Create: `server/ledger/ledger-reconciliation.js`
- Modify: `server/rbc.js`
- Modify: `server/adminMining.js`
- Create: `server/reviews/review-service.js`
- Create: `server/jobs/review-settlement.js`
- Create: `supabase/migrations/202608150005_wrs_ledger_reviews.sql`
- Modify: `src/screens/Wallet.jsx`
- Modify: `src/screens/Transactions.jsx`
- Modify: `src/screens/admin/MiningAdmin.jsx`
- Test: `server/tests/ledger-integrity.test.js`
- Test: `server/tests/review-settlement.test.js`

**Interfaces:**
- `postLedgerTransaction({ tenantId, idempotencyKey, entries, sourceType, sourceId })` requires balanced debit/credit entries and returns an immutable transaction.
- `requestWithdrawal({ userId, quoteId, bankDetails })` creates a pending withdrawal without paying it.
- `reviewWithdrawal({ adminId, withdrawalId, decision, note })` moves it to approved/rejected.
- `markWithdrawalPaid({ adminId, withdrawalId, payoutReference })` moves only approved requests to paid and records settlement evidence.

- [ ] **Step 1: Define the double-entry chart of accounts.**

  Create accounts for user available RBC, pending RBC, platform liability, fees, refunds, and payout clearing. Enforce balanced entries, non-negative spendable balances, immutable posted entries, and compensating entries instead of edits.

- [ ] **Step 2: Connect mining/rewards to ledger postings.**

  Replace direct balance increments in mining, event-code, boost, package, and review flows with source-linked ledger transactions. Each reward must include `sourceType`, `sourceId`, evidence status, and approval actor/job.

- [ ] **Step 3: Make review the only route to payable contribution rewards.**

  Submitted training/data evidence remains non-payable until a reviewer or approved automated reviewer posts an approval decision. Rejections and corrections must be auditable and owner-scoped.

- [ ] **Step 4: Implement the bank payout workflow.**

  Store bank details encrypted or tokenized, display masked values, require confirmation, prevent duplicate pending withdrawals, and expose admin queue actions for approve/reject/mark-paid. No user action can mark a withdrawal paid.

- [ ] **Step 5: Add reconciliation jobs.**

  Recompute balances from ledger entries, compare them with snapshots, compare payout records with provider/admin references, and alert on any mismatch. Reconciliation must be read-only by default; repairs require an audited operator command.

- [ ] **Step 6: Test money invariants.**

  Cover duplicate rewards, concurrent claims, negative/overflow amounts, refund after payout, rejected withdrawal reuse, double payout, mismatched ledger totals, and cross-user access.

---

## Task 7: Replace deployment simulation with a safe operational boundary

**Files:**
- Create: `server/deployments/provider.js`
- Create: `server/deployments/dispatch-service.js`
- Create: `server/deployments/telemetry-service.js`
- Create: `server/deployments/safety-service.js`
- Create: `server/deployments/contract-service.js`
- Modify: `server/deployments.js`
- Modify: `src/screens/Deploy.jsx`
- Modify: `src/screens/ActiveDeployment.jsx`
- Modify: `src/screens/DeploymentDetails.jsx`
- Create: `supabase/migrations/202608150006_wrs_deployment_operations.sql`
- Test: `server/tests/deployment-safety.test.js`
- Test: `server/tests/deployment-provider.test.js`

**Interfaces:**
- `requestDeployment()` creates a request only.
- `approveDeployment()` requires tier, contract, consent, safety, and payment gates.
- `dispatchDeployment()` calls a provider with an idempotency key and returns a provider job ID.
- `ingestTelemetry()` validates signed/provider-authenticated telemetry and records immutable safety events.
- `pauseDeployment()` is available to authorized safety operators and automatically on configured anomalies.

- [ ] **Step 1: Decide the public launch mode.**

  If no real robot-fleet provider is available, disable deployment creation for public users and label the internal simulator as non-production. If public deployment is required, complete provider certification, contract settlement, safety review, telemetry ingestion, and incident runbooks before enabling it.

- [ ] **Step 2: Implement the state machine and gates.**

  Enforce the transition list from Task 1 server-side. Require active entitlement, accepted contract version, consent, approved opportunity, operator approval where required, and an emergency-stop-ready safety state before dispatch.

- [ ] **Step 3: Add provider dispatch and retry behavior.**

  Use an idempotency key per dispatch. Persist request/response metadata, retry transient failures with exponential backoff, and send permanent failures to a dead-letter queue. Never create a second physical dispatch for a retry.

- [ ] **Step 4: Add telemetry and safety controls.**

  Validate provider signatures, reject out-of-order or stale telemetry, store health/battery/location/safety events according to privacy policy, and automatically pause on heartbeat loss, geofence breach, collision/anomaly, or operator stop.

- [ ] **Step 5: Add settlement and incident handling.**

  Tie deployment work/usage to contract and ledger records. Provide operators with pause, cancel, inspect, and recovery actions, each requiring a reason and audit event.

- [ ] **Step 6: Test failure modes.**

  Cover duplicate dispatch, provider timeout, stale telemetry, lost heartbeat, safety stop, contract mismatch, unauthorized operator action, settlement mismatch, and restart recovery.

---

## Task 8: Add durable background jobs and notifications

**Files:**
- Create: `server/jobs/queue.js`
- Create: `server/jobs/worker.js`
- Create: `server/jobs/dead-letter.js`
- Create: `server/jobs/definitions.js`
- Modify: `server/app.js`
- Modify: `server/security.js`
- Modify: `src/screens/Notifications.jsx`
- Create: `server/tests/jobs.test.js`

- [ ] **Step 1: Choose a durable queue and failure policy.**

  Use a managed queue compatible with the production environment. Persist job ID, type, attempt count, visibility deadline, last error, and dead-letter status. Do not use in-process timers for payment, scan, review, payout, or telemetry work.

- [ ] **Step 2: Move asynchronous work into jobs.**

  Add jobs for payment reconciliation, media scanning, review assignment, reward settlement, withdrawal reminders, retention deletion, notification fan-out, and deployment telemetry processing.

- [ ] **Step 3: Make jobs retry-safe.**

  Every job must have a deterministic key, bounded retries, exponential backoff, timeout, and an explicit dead-letter path. Replays must call idempotent services.

- [ ] **Step 4: Make notifications server-owned.**

  Store notifications and read state in PostgreSQL, derive them from auditable domain events, and keep the UI as a read/acknowledge client. Do not use mock notification data in production routes.

- [ ] **Step 5: Test restart and replay behavior.**

  Kill a worker between side effect and acknowledgement, restart it, replay the job, and assert one business outcome plus one audit chain.

---

## Task 9: Add observability, backups, and incident readiness

**Files:**
- Modify: `server/security.js`
- Modify: `server/app.js`
- Create: `server/observability/metrics.js`
- Create: `server/observability/tracing.js`
- Create: `Docs/operations/runbook.md`
- Create: `Docs/operations/incident-response.md`
- Create: `Docs/operations/backup-restore.md`
- Test: `server/tests/observability.test.js`

- [ ] **Step 1: Standardize structured logs.**

  Emit JSON logs with request ID, trace ID, user/tenant ID where safe, route, status, latency, provider event ID, job ID, and error code. Redact tokens, bank details, file contents, and raw webhook bodies.

- [ ] **Step 2: Add metrics and traces.**

  Measure request latency/error rate, payment webhook lag, entitlement activation lag, queue depth, scan failures, review age, payout age, ledger reconciliation drift, deployment heartbeat loss, and database pool saturation.

- [ ] **Step 3: Add readiness checks.**

  `/readyz` must verify database connectivity, migration version, queue connectivity, storage configuration, provider configuration, and required secrets without exposing secret values.

- [ ] **Step 4: Configure alerts.**

  Alert on payment webhook failures, repeated reconciliation mismatches, dead-letter growth, upload scan failures, payout aging, unsafe deployment telemetry, database errors, and auth/session anomalies.

- [ ] **Step 5: Complete backup and restore drills.**

  Document RPO/RTO, run a staging restore from backup, verify row counts and ledger totals, test object-storage restoration, and record evidence. A backup that has not been restored is not a release control.

- [ ] **Step 6: Write operator runbooks.**

  Include payment outage, webhook replay, compromised session, media malware incident, ledger mismatch, payout failure, database failover, queue backlog, and deployment emergency-stop procedures.

---

## Task 10: Close CI, dependency, frontend, and end-to-end gaps

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.js`
- Create: `playwright.config.js`
- Create: `src/**/*.test.jsx`
- Create: `e2e/auth.spec.js`
- Create: `e2e/checkout.spec.js`
- Create: `e2e/training-upload.spec.js`
- Create: `e2e/withdrawal.spec.js`
- Create: `e2e/deployment-gates.spec.js`

- [ ] **Step 1: Align CI with the runtime.**

  Change `actions/setup-node` to Node 22 and fail if `node --version` is below the package engine. Keep `npm ci` as the only install path.

- [ ] **Step 2: Expand CI verification.**

  Run, in order:

  ```bash
  npm ci
  npm run lint
  npm run test:unit
  npm run test:api
  npm run test:migrations
  npm run test:e2e
  npm audit --audit-level=high
  npm run build
  git diff --check
  ```

  Add a separate migration/RLS job using a clean local Supabase/Postgres service.

- [ ] **Step 3: Resolve the three audit vulnerabilities.**

  Upgrade or replace the affected transitive build dependencies, regenerate the lockfile, rerun the audit, and document any remaining vulnerability with a bounded exception only if the vulnerable package is unreachable in production. Do not suppress the audit globally.

- [ ] **Step 4: Add frontend unit tests.**

  Cover auth redirects, payment state rendering, entitlement gates, upload progress/failure states, wallet status presentation, notification read state, and deployment safety locks.

- [ ] **Step 5: Add end-to-end tests against staging-like services.**

  Test unverified login, verified login, checkout pending/success/failure, signed webhook activation, media quarantine/rejection, approved reward, withdrawal admin review, deployment gate denial, and emergency pause.

- [ ] **Step 6: Set coverage and bundle budgets.**

  Require at least 80% statement/branch coverage for payment, ledger, auth, media-policy, and deployment-safety modules. Split the 1.18 MB and 980 KB chunks by lazy-loading the robot model, Three.js scene, admin screens, and feature modules; fail CI when initial JS exceeds the agreed budget.

---

## Task 11: Remove production mock paths and add feature flags

**Files:**
- Modify: `src/screens/Checkout.jsx`
- Modify: `src/screens/PaymentSuccess.jsx`
- Modify: `src/screens/Packages.jsx`
- Modify: `src/screens/TrainingModule.jsx`
- Modify: `src/screens/Deploy.jsx`
- Modify: `src/screens/ActiveDeployment.jsx`
- Modify: `src/screens/Notifications.jsx`
- Modify: `src/data/mock.js`
- Create: `server/feature-flags.js`
- Create: `src/lib/feature-flags.js`
- Test: `server/tests/production-feature-flags.test.js`

- [ ] **Step 1: Classify every mock as demo-only or remove it.**

  Search `src/data/mock.js` imports and any hardcoded payment, deployment, notification, wallet, user, or mining values. Production routes must render API state, an explicit unavailable state, or a feature-flagged internal demo—not plausible fake activity.

- [ ] **Step 2: Add server-owned feature flags.**

  Flags must be evaluated server-side for protected actions. Client flags may hide UI only; they cannot bypass entitlements, payment, review, ledger, or safety gates.

- [ ] **Step 3: Add error boundaries and recovery.**

  Wrap high-risk feature screens with an error boundary that reports a redacted trace ID, offers retry, and preserves navigation. Do not show a success state when a mutation response is unknown.

- [ ] **Step 4: Verify demo isolation.**

  Production configuration must reject `WRS_DEMO_MODE=true`, local object storage, mock payment methods, and simulated deployment providers unless an internal environment explicitly enables them.

---

## Task 12: Staging cutover and launch certification

**Files:**
- Modify: `Docs/production-readiness.md`
- Create: `Docs/operations/release-checklist.md`
- Create: `Docs/operations/rollback-plan.md`
- Create: `.github/workflows/deploy-staging.yml`
- Create: `.github/workflows/deploy-production.yml`

- [ ] **Step 1: Provision production-like staging.**

  Use separate Supabase project/environment, provider test accounts, private storage buckets, queue, secret manager, monitoring, and domain. Staging must not share production credentials or buckets.

- [ ] **Step 2: Apply migrations and import only approved fixtures.**

  Start from an empty database, apply migrations in order, seed package/catalogue configuration through admin migrations, and verify no demo users or mock wallet balances exist.

- [ ] **Step 3: Run the full release rehearsal.**

  Execute registration/email verification, payment provider test webhook, entitlement activation, contribution upload/scan/review, ledger reward, bank withdrawal/admin payout simulation, deployment gate/telemetry test or feature-disabled assertion, notification delivery, backup restore, and rollback.

- [ ] **Step 4: Conduct security review.**

  Review RLS policies, CSP, cookies, CSRF, webhook signatures, storage access, admin roles, IDOR/BOLA cases, rate limits, secrets, dependency audit, and log redaction. Run an external penetration test or documented internal equivalent before public launch.

- [ ] **Step 5: Canary release.**

  Release to a small allowlist, monitor error budgets and business metrics for at least one full payment/review/payout cycle, and keep rollback credentials and migration reversal procedures ready.

- [ ] **Step 6: Approve or block public launch.**

  Public launch is approved only when every checkbox below is evidenced:

  ```text
  [ ] normalized Postgres repositories are the production source of truth
  [ ] payment attempts and signed webhooks activate/revoke entitlements
  [ ] refund/chargeback/reconciliation paths are tested
  [ ] private storage, scanning, deletion, retention, and access audit work
  [ ] tokens are not stored in localStorage and CSP/CSRF tests pass
  [ ] review decisions and double-entry ledger are production-backed
  [ ] bank withdrawals require admin approval and payout evidence
  [ ] deployments are provider-backed or fully disabled for public users
  [ ] jobs retry safely and dead letters are monitored
  [ ] backups restore successfully and RPO/RTO are documented
  [ ] CI runs Node 22, full tests, migration tests, E2E, audit, and build
  [ ] no unresolved high-severity audit/security finding remains
  [ ] runbooks, on-call ownership, alerts, and rollback are approved
  ```

---

## Recommended execution order

1. Complete Task 1 and commit the contracts.
2. Complete Task 2 in staging and prove normalized Postgres/RLS behavior.
3. Run Tasks 3, 4, and 5 in parallel after the schema interfaces are stable.
4. Complete Task 6 before enabling any public wallet, rewards, or withdrawal action.
5. Complete Task 7 or disable deployments for all public accounts.
6. Complete Tasks 8 and 9 before accepting real payments or sensitive uploads.
7. Complete Tasks 10 and 11 before the first canary.
8. Complete Task 12 as the final release gate.

## Definition of production-ready

The app is production-ready only when a new user can register and verify safely, purchase a supported package through a real provider, receive an entitlement only from a verified webhook, submit private media through a scanned storage pipeline, receive rewards through an immutable ledger after review, request a bank withdrawal that an admin can approve and pay with evidence, and—if deployments are enabled—operate a real deployment through provider dispatch, telemetry, safety, contract, and settlement controls. Every step must be observable, replay-safe, recoverable, and covered by CI and staging evidence.
