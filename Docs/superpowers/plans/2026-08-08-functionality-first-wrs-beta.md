# Functionality-First WRS Beta Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use parallel bounded workstreams with test-first changes and review each returned patch before integration.

**Goal:** Replace the highest-risk WRS mock behavior with a functional, persisted beta slice covering authenticated robot setup, training completion, data-task acceptance/submission, deployment requests, and trustworthy wallet/mining reads.

**Architecture:** Keep the current dependency-light Node modular monolith for this slice, but move new domain behavior into focused server modules behind the existing repository boundary. The React client will use the existing API helper for authenticated flows and will show explicit unavailable states where an external provider or operational system is not yet connected. JSON storage remains development-only; no UI will imply that it is production finance or sensitive-data infrastructure.

**Tech Stack:** Node.js HTTP API, JSON repository adapter, Node test runner, React 18, React Router 6, Vite, existing API/error/validation primitives.

## Global Constraints

- Functionality takes priority over new visual polish or additional mock screens.
- No client-controlled reward, balance, approval, deployment, or verification state may be treated as authoritative.
- Every new mutation has boundary validation, authenticated ownership checks, deterministic error codes, and an idempotency strategy where retries can duplicate state.
- Monetary values remain integer minor units; XP/RBC/credits remain separate values.
- Sensitive capture/upload remains unavailable until a real storage, consent, deletion, and access-audit path exists.
- Preserve unrelated user changes and do not rewrite the existing design system.
- Add tests before implementation and run the failing test before writing production code.

## Workstream 1: Authenticated robot setup

**Files:**
- Modify: `server/app.js`, `server/validation.js`, `server/tests/api.test.js`
- Modify: `src/lib/api.js`, `src/screens/Login.jsx`, `src/screens/Register.jsx`, `src/screens/Onboarding.jsx`
- Create/modify: `src/components/RequireAuth.jsx`, `src/components/AppShell.jsx`, `src/App.jsx`

**Contract:**
- `PATCH /api/v1/robot` accepts `name`, `personality`, and a bounded `config` object; it persists only the authenticated user's robot.
- `GET /api/v1/me` remains the session source of truth.
- Unauthenticated application routes redirect to `/login`; public package routes remain public.
- Onboarding submits its selected name, personality, package intent, and appearance config before entering `/home`.
- Verification is not claimed complete by navigation alone; until an external provider exists, the UI must show verification as unavailable/pending rather than silently accepting arbitrary codes.

**Tests:**
- Authenticated user can persist robot setup and retrieve it.
- User A cannot mutate User B's robot.
- Protected route guard does not render private content without a token.
- Invalid robot config returns `VALIDATION_ERROR`.

## Workstream 2: Training and data-task lifecycle

**Files:**
- Create: `server/dataTasks.js`
- Modify: `server/app.js`, `server/seed.js`, `server/tests/api.test.js`
- Modify: `src/screens/TrainingModule.jsx`, `src/screens/Training.jsx`, `src/screens/DataContribution.jsx`, `src/screens/DataTask.jsx`, `src/screens/DataQuality.jsx`

**Contract:**
- `GET /api/v1/training/modules` returns server-owned lock/completion state.
- `POST /api/v1/training/modules/:id/complete` remains idempotent and is called from the real training completion action.
- `POST /api/v1/data/tasks/:id/accept` creates one user-scoped assignment with status `accepted`.
- `POST /api/v1/data/tasks/:id/submit` accepts structured task answers only, validates size/type, stores submission metadata and status `submitted`, and is idempotent for the same assignment.
- Sensitive voice/face/movement capture controls are disabled with an explicit “provider not connected” state; no fake upload success is shown.
- Client progress is read from the API and cannot award RBC by itself.

**Tests:**
- Tier-gated training completion works and duplicate completion awards XP once.
- A task cannot be accepted twice as two assignments.
- A user cannot submit another user's assignment.
- Invalid/empty task submission is rejected.
- Submitted tasks never directly become approved or financially payable.

## Workstream 3: Deployment request lifecycle

**Files:**
- Create: `server/deployments.js`
- Modify: `server/app.js`, `server/seed.js`, `server/tests/api.test.js`
- Modify: `src/screens/Deploy.jsx`, `src/screens/DeploymentDetails.jsx`, `src/screens/ActiveDeployment.jsx`

**Contract:**
- `GET /api/v1/deployments/opportunities` returns a server-owned opportunity catalogue with simulation/real availability labels.
- `POST /api/v1/deployments/requests` accepts an industry slug and optional note, validates tier eligibility, creates status `requested`, and is idempotent by user/opportunity.
- `GET /api/v1/deployments` returns only the authenticated user's requests.
- UI buttons call the API and render requested/pending/error states; revenue remains estimated or unavailable until reconciliation exists.
- No screen may claim an active physical deployment.

**Tests:**
- Eligible package can submit a deployment request.
- Ineligible package receives `FORBIDDEN`.
- Duplicate requests are idempotent.
- Deployment records are scoped to the authenticated user.

## Workstream 4: Wallet and mining integrity

**Files:**
- Create: `server/ledger.js`
- Modify: `server/mining.js`, `server/app.js`, `server/tests/api.test.js`
- Modify: `src/screens/Mining.jsx`, `src/screens/Wallet.jsx`, `src/screens/Transactions.jsx`, `src/screens/DataRevenue.jsx`

**Contract:**
- Wallet reads are server-backed and distinguish XP, RBC, pending rewards, and confirmed money.
- Mining progress endpoints no longer accept arbitrary “+1” contribution credit as proof of work; progress must reference a server-created task assignment/submission or remain clearly development-only.
- Event codes and boosts remain idempotent and user-scoped.
- Idempotency records include operation identity and request fingerprint; replaying a key against a different mutation is rejected.
- Withdraw/deposit controls are disabled until a provider and reconciliation workflow exist; no success toast may imply money moved.

**Tests:**
- Client cannot award mission progress without a valid server-side source event.
- Reusing an idempotency key for a different operation returns a conflict.
- Wallet totals are derived from server-owned records.
- Mining balance changes are integer-safe and cannot go negative.

## Integration and verification

- Run each workstream's focused API tests after its patch returns.
- Review changed files for overlap and merge conflicts.
- Run `npm run test:api`, `npm run build`, and `git diff --check`.
- Add a smoke-path checklist covering register → onboarding → training → accept task → submit task → deployment request → wallet read.
- Report remaining mock-only features explicitly: payments, identity/phone delivery, real uploads/storage, human review, marketplace settlement, referrals, community, academy, notifications, and support operations.

## Release gate

This slice is a functional development beta only. It is not public production until PostgreSQL, managed secrets, rate limiting, real verification/provider integrations, consent/deletion/audit controls, payment webhooks, and operational monitoring are implemented.

