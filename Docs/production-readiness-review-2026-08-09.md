# WRS production-readiness review — 2026-08-09

## Executive decision

**Release recommendation: BLOCK public production.**

The current working tree is a functional development beta. The server-backed core is useful for demonstrations and controlled internal testing, but the project does not yet have production-grade persistence, identity verification, sensitive-data handling, payment settlement, physical deployment operations, or ecosystem services.

This review covers the current dirty `main` working tree, all five production-plan tracks, the React screens, the Node API, configuration, tests, and dependency posture. It does not treat the isolated worktrees as merged product code.

## Verification evidence

- `npm run test:api`: **21/21 passed**.
- `npm run build`: **passed**, but took approximately **3 minutes** and emitted two large chunks: approximately 1.06 MB and 980 kB minified.
- `npm audit --omit=dev --audit-level=high`: **2 moderate React Router advisories** with an available fix.
- Server surface: 17 JavaScript modules and 21 API tests.
- API routes are concentrated in `server/app.js`; there are no production modules for PostgreSQL, payments, object storage, dispatch, telemetry, marketplace, academy, community, referrals, notifications, or support.
- The repository’s own gate says this is not public production and lists the required unfinished integrations in `Docs/production-readiness.md:3-38`.

## Feature readiness matrix

| Feature area | Current status | Production decision |
| --- | --- | --- |
| Registration, login, sessions, settings, robot profile | Server-backed development flow | **Conditional beta only** |
| Email/phone/identity verification and recovery | Not implemented end-to-end | **Not ready** |
| Training modules and XP | Basic server-backed completion path | **Conditional beta only** |
| Text data tasks | Server-backed accept/submit path | **Conditional beta only** |
| Audio/image/video capture and sensitive data | Explicitly blocked without providers | **Not ready** |
| Review, appeals, provenance, dataset release | No production service in the current tree | **Not ready** |
| Deployment catalogue and requests | Server-backed simulation/request flow | **Simulation only** |
| Physical robot dispatch, telemetry, safety, contracts | Not implemented | **Not ready** |
| Wallet reads, mining, event codes, boosts | Development JSON-backed program state | **Conditional beta only; not money production** |
| Checkout, payments, deposits, withdrawals, refunds | Provider flows unavailable | **Not ready** |
| Rewards and cash settlement | No production financial source of truth | **Not ready** |
| Marketplace, academy, community, referrals | Static/mock or explicit unavailable states | **Not ready** |
| Notifications and support | Explicitly unavailable; no durable service | **Not ready** |
| Landing page, navigation, 3D robot presentation | UI/demo functionality | **Suitable for demo only** |

## Release-blocking findings

### PR-001 — P0: production configuration does not select a transactional database

**Evidence:** `server/config.js:12` requires `WRS_DATABASE_URL` in production, but `server/index.js:6` always constructs `createStore(config.dataFile)`. `server/store.js:6-29` is a JSON-file adapter with an in-process write queue.

**Impact:** A production process can pass the database-environment gate while still using a local JSON file. Multiple instances, concurrent writers, backup/restore, migrations, and failover are not safe. This is a release blocker for identity, entitlements, tasks, wallet, rewards, and every user-owned record.

**Required action:** Implement and select a real PostgreSQL adapter, migrations, transaction boundaries, rollback strategy, backup/restore drill, and a startup check that proves the selected adapter is PostgreSQL in production.

### PR-002 — P1: identity lifecycle is incomplete

**Evidence:** Registration creates `verified: false` and `verificationStatus: 'pending'` in `server/app.js:100-105`; the current API exposes only register/login/logout/me and has no password-reset, email-delivery, phone-OTP, or identity-provider route. The UI itself states that email, phone, and identity verification are required in `src/screens/Register.jsx:133`.

**Impact:** Sensitive actions cannot be tied to a verified person, and account recovery and abuse handling are incomplete. Supabase email confirmation is not equivalent to the planned phone/identity lifecycle.

**Required action:** Integrate provider-backed verification and recovery, persist verification events, require verification at sensitive boundaries, and test provider sandbox flows and replay/expiry behavior.

### PR-003 — P1: the product surface is materially larger than the server contract

**Evidence:** `src/App.jsx:68-105` exposes packages, checkout, data, wallet, rewards, marketplace, academy, community, referrals, notifications, and support routes. Multiple screens still import static fixtures, including `src/screens/Packages.jsx:6`, `src/screens/Checkout.jsx:6`, `src/screens/Marketplace.jsx:9`, `src/screens/Training.jsx:5`, `src/screens/TrainingModule.jsx:7`, and `src/screens/DeploymentDetails.jsx:6`. The API route inventory in `server/app.js:98-151` has no corresponding services for most of these screens.

**Impact:** A user can navigate through product-shaped screens that are not backed by authoritative state. Several screens correctly show unavailable states, but the static fixture imports remain a factual-risk boundary and are not a production implementation.

**Required action:** Make every user-facing action server-driven, or remove/clearly gate the route. Add contract tests that prove no mock fixture can create or imply user state.

### PR-004 — P1: sensitive capture and data rights infrastructure is absent

**Evidence:** `src/screens/DataTask.jsx:50,130` and `src/screens/TrainingModule.jsx:344` explicitly block capture because providers are not connected. The current `server/` tree has no object-storage, malware-scanning, quarantine, retention/deletion, provenance, or review service. The required gates remain unchecked in `Docs/production-readiness.md:10-12` and `Docs/superpowers/plans/2026-08-09-wrs-production-02-training-data.md:136-143`.

**Impact:** Voice, face, movement, image, video, and document data cannot be accepted safely or legally. A submitted task must not become payable without independent review and rights evidence.

**Required action:** Add private storage, server-owned object keys, scanning/quarantine, consent and purpose records, retention/deletion jobs, provenance, reviewer scopes/appeals, and a sandbox failure-injection flow.

### PR-005 — P1: commerce is not a production payment system

**Evidence:** `src/screens/Checkout.jsx:35,43,175-182` says no payment is processed and package access is not active. The API exposes only read-only wallet routes at `server/app.js:149-150`; there are no payment-intent, signed-webhook, deposit, withdrawal, refund, or chargeback routes in the current server. The release gates explicitly require these in `Docs/superpowers/plans/2026-08-09-wrs-production-04-commerce-wallet-rewards.md:137-144`.

**Impact:** The project cannot safely charge customers, activate entitlements, move money, reconcile providers, or handle refunds/chargebacks. JSON-backed mining/reward values must not be represented as cash or production financial balances.

**Required action:** Integrate a sandboxed payment provider, signed/replay-safe webhooks, provider-bound idempotency, immutable ledger/rebuild, reconciliation, fraud holds, KYC/limits, payout callbacks, refund/chargeback workflows, and an independent finance approval.

### PR-006 — P1: deployment is a request simulator, not robot operations

**Evidence:** `src/screens/Deploy.jsx:44` states that dispatch, telemetry, contracts, and settlement are not connected; `src/screens/ActiveDeployment.jsx:34-36` states no physical deployment is active. The current server has catalogue/request code but no dispatch adapter, device identity/custody, telemetry, safety case, emergency stop, incident control, contract, or settlement service.

**Impact:** Activating this as a physical-robot product would create safety, custody, insurance, contractual, and financial exposure. A request record is not evidence of an active deployment.

**Required action:** Keep physical flags disabled until provider callbacks, device/control identity, safety preflight/pause/stop, incident runbooks, contracts, operator permissions, and simulation drills are verified.

### PR-007 — P1: ecosystem features are not implemented as production services

**Evidence:** `src/screens/Community.jsx:8-9`, `src/screens/Referrals.jsx:12-16`, and `src/screens/Notifications.jsx` show explicit unavailable states. `src/screens/Marketplace.jsx:9,123` uses fixtures and reports that catalogue/licensing/payment/installation services are not connected. The API has no marketplace, academy, community, referral, notification, or support routes.

**Impact:** There is no durable moderation, referral qualification, certificate issuance, skill licensing/isolation, notification delivery, ticket assignment, or dataset marketplace rights control.

**Required action:** Keep these areas unavailable or implement server-owned lifecycle services, permissions, abuse controls, audit trails, provider retries, and end-to-end UI contract tests before launch.

## Security and operations findings

### PR-008 — P1: bearer tokens are stored in browser localStorage

**Evidence:** `src/lib/api.js:3,23-30` stores `wrs.accessToken` in `localStorage`. The API bearer token is then sent from `src/lib/api.js:38-45`.

**Impact:** Any XSS or compromised same-origin script can read and exfiltrate the session token. No CSP is visible in `index.html` or the Vite configuration, so the browser-side token exposure has limited defense in depth.

**Required action:** Prefer short-lived, rotated, HttpOnly/Secure/SameSite cookies with CSRF protection, or document and harden the bearer-token model with strict CSP, token rotation, revocation, and XSS controls.

### PR-009 — P1: rate limiting and readiness are process-local and can be misleading

**Evidence:** `server/security.js:7-23` stores limiter buckets in a process-local `Map`; `server/app.js:91-95` applies it per process and declares `/readyz` ready after only `store.load()` succeeds. `Docs/production-readiness.md:14,33` already identifies distributed controls and observability as unfinished.

**Impact:** Limits do not coordinate across instances, and `/readyz` can report ready while database, provider, queue, or migration dependencies are unavailable. This weakens abuse resistance and rollout automation.

**Required action:** Use a distributed limiter, structured logs/metrics/traces, dependency-aware readiness, startup migrations, and alerting with runbooks.

### PR-010 — P2: dependency and frontend performance debt remain

**Evidence:** `npm audit --omit=dev --audit-level=high` reports two moderate React Router advisories. The verified build emitted approximately 1.06 MB and 980 kB minified chunks and took about three minutes.

**Impact:** The dependency advisories increase browser security risk, while large bundles harm first load, mobile reliability, and operational rollout speed.

**Required action:** Upgrade React Router within compatibility constraints, rerun the complete suite, and split the 3D/product surface with route-level dynamic imports and explicit performance budgets.

## What can be exposed safely today

- Public landing/demo content and 3D robot presentation, clearly labelled as illustrative.
- Controlled internal testing of registration/login, settings, robot configuration, server-backed training-module state, text-task accept/submit, deployment request simulation, and read-only wallet/mining demonstrations.
- Provider-unavailable screens for payments, sensitive capture, physical deployment, community, referrals, notifications, and support.

These are beta/demo capabilities, not a public production launch approval.

## Go/no-go conditions

Do not launch publicly until all of the following are evidenced in a production-like environment:

1. PostgreSQL is the runtime source of truth, with migration/rollback and restore-drill evidence.
2. Identity verification, recovery, session revocation, and sensitive-action authorization work end to end.
3. Sensitive capture has private storage, scanning, consent, retention, deletion, provenance, review, and appeals.
4. Payment, webhook, ledger, reconciliation, refund, chargeback, KYC, and payout flows pass sandbox failure drills.
5. Physical deployment remains disabled until dispatch, device identity, telemetry, safety, contracts, and incident controls are operational.
6. Ecosystem screens are either server-backed or unavailable; no static fixture implies user state or commercial availability.
7. Distributed rate limiting, observability, dependency scanning, CI/CD promotion, backup, and incident runbooks are live.

