# World Robotic System architecture

## Context

WRS is a mobile-first product whose durable loop is **own → train → contribute → deploy → monitor → earn → upgrade**. The current web client is a Vite prototype and previously stored all state in static JavaScript and browser storage. The backend owns identity, robot state, entitlements, training completions, data-task eligibility, wallet transactions, and audit-sensitive mutations.

The first backend slice is a dependency-light Node HTTP service. It is intentionally split into HTTP handlers, validation/authentication, domain rules, and a repository adapter. A JSON repository is used for local development only; the application layer does not depend on its file format. The target remains a modular monolith until scale or team ownership provides evidence for a service boundary.

## Containers

| Container | Responsibility | Initial implementation |
| --- | --- | --- |
| API | Versioned HTTP contract, authentication, validation, error envelope, CORS | `server/app.js` |
| Auth | Password hashing and signed, expiring bearer sessions | `server/auth.js` |
| Domain | Tier gating, robot progression, idempotent completions | API orchestration in `server/app.js` (next extraction target) |
| Repository | Durable reads/writes with atomic local persistence | `server/store.js` |
| PostgreSQL adapter | Production persistence, transactions, indexes, migrations | Feature slice 2 |
| Worker/outbox | Notifications, payment reconciliation, deployment telemetry | Feature slices 3–5 |

## Target domain modules

| Module | Owns | Important boundary |
| --- | --- | --- |
| Identity and access | accounts, verification, sessions, role grants | packages cannot grant authority roles |
| Robots and entitlements | robot profiles, passports, capabilities, packages | digital profile is separate from any physical device/title |
| Learning | courses, training modules, progress, certifications | completion events may award XP exactly once |
| Consent and privacy | consent evidence, purposes, withdrawals, rights requests, retention | other modules reference consent IDs; they do not invent consent flags |
| Contributions | projects, tasks, assignments, submissions, source metadata | submission acceptance is not dataset release approval |
| Validation | review queues, rubrics, decisions, calibration, appeals, reviewer credentials | self-review and conflict assignments are prohibited |
| Datasets | registry, lineage, curation, manifests, releases, licenses | released versions are immutable; changes create a new version |
| Community | groups, events, leader scopes, event-code claims, conduct cases | leaders receive aggregate/minimum-necessary member data |
| Opportunities | opportunities, eligibility, contracts, deployments, performance | physical devices are separate entities when introduced |
| Rewards | rules, XP, points, credits, boosts, source-event idempotency | non-cash value is separate from money |
| Finance | pending/confirmed money ledger, withdrawals, reconciliation | append-only, integer minor units, dual control for corrections |
| Marketplace | publishers, items, compatibility, orders, installs | skills marketplace is separate from enterprise dataset licensing |
| Operations | support, incidents, moderation, audit search | no universal admin role in production |

Modules may share one PostgreSQL cluster initially but own their tables and expose
commands/queries or durable events at boundaries. Cross-module writes must not rely on
ad hoc table mutation.

## Critical workflows

### Contribution and validation

1. Contributions creates an assignment and records the required project/rubric/consent
   versions.
2. Consent confirms current, purpose-specific permission before upload finalization.
3. Contributions stores submission metadata and private object references.
4. Automated checks append findings and request a Validation review.
5. Validation assigns an eligible, conflict-free reviewer and records decisions.
6. Appeals create a new adjudication task; prior decisions remain immutable.
7. Datasets selects accepted submission versions, records transformations, and produces
   a release manifest for separate approval.

### Reward and money handling

Domain events such as `TrainingCompleted`, `SubmissionAccepted`, `EventClaimVerified`,
or `DeploymentReconciled` are consumed idempotently. Rewards may post XP/points/credits.
Only an authorized commercial program can request a pending money entry; Finance moves
it to confirmed after reconciliation. Estimated values are projections and are never
ledger entries.

## API contract

All successful responses use `{ "data": ... }`. Errors use `{ "error": { "code": "...", "message": "...", "details": ... } }`. Clients must send `Authorization: Bearer <token>` for protected routes.

Implemented routes:

- `GET /healthz`, `GET /readyz`
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
- `GET /api/v1/me`, `GET/PATCH /api/v1/robot`
- `GET /api/v1/dashboard`, `GET /api/v1/packages`
- `GET /api/v1/training/modules`, `POST /api/v1/training/modules/:id/complete`
- `GET /api/v1/data/tasks`
- `GET /api/v1/wallet`, `GET /api/v1/wallet/transactions`

Training completion is idempotent by `(userId, type, targetId)` and updates XP exactly once. Monetary values are stored as integer cents; no floating-point balance arithmetic is permitted.

New endpoints should use command-specific authorization, idempotency keys for retryable
mutations, optimistic version checks for review/state transitions, and cursor pagination
for queues and histories. File upload/download uses short-lived signed URLs; raw data
must not pass through general analytics or application logs.

## Data ownership and production migration

The current service owns users, robots, packages, training modules, completions, wallet transactions, and sessions. The local store writes through a temporary file and rename to avoid partially written snapshots. A PostgreSQL adapter must preserve the current repository interface and move mutations into database transactions. New ecosystem entities should follow the module ownership above rather than expand a single generic store API.

Production persistence should add:

- unique indexes on `users.email`, `robots.user_id`, and completion idempotency keys;
- a ledger-style append-only transaction table with a derived balance;
- encrypted/managed secrets, rotating refresh tokens, and server-side session revocation;
- migrations and a backfill from the local seed shape before switching adapters.

## Scaling and operational rules

- Keep API instances stateless; sessions and domain state must be externalized.
- Keep money movement synchronous and transactional; use an outbox for notifications and provider callbacks.
- Validate at the boundary and return stable error codes.
- Add rate limiting to auth, task submission, and withdrawal endpoints before public deployment.
- Emit request IDs and structured logs; add metrics for latency, auth failures, mutation conflicts, and provider reconciliation.
- Treat consent, identity verification, deletion, and audit events as first-class records before accepting biometric or voice data.
- Encrypt uploaded contribution objects separately from transactional metadata, apply
  purpose-scoped access, and retain access logs.
- Use a transactional outbox for cross-module events; consumers store processed event
  IDs so retries cannot duplicate rewards, notifications, or state transitions.
- Version rubrics, reward rules, consent text, package entitlements, and dataset manifests
  instead of overwriting policy inputs used by historic decisions.
- Keep contributor, validator, robot, and community reputation as separate explainable
  projections; do not create a universal trust score.

## Feature sequence

1. Foundation (this slice): API shell, auth, robot, packages, training, data-task catalog, wallet read model, tests.
2. Persistence: PostgreSQL schema/migrations, refresh-token sessions, audit log, rate limiting.
3. Commerce: checkout intents, payment provider webhook verification, package entitlement transactions.
4. Contributions: consent records, upload sessions, tasks, submissions, automated checks,
   staff moderation, appeals, and provenance.
5. Trusted network: validator credentials/queues/calibration, contributor quality,
   community roles/events, and scoped dashboards.
6. Deployments: opportunities, contracts, robot assignment, telemetry ingestion,
   lifecycle state machine, and reconciliation.
7. Enterprise data: dataset registry, lineage, release manifests, licensing, secure
   delivery, and program distributions.
8. Product surfaces: notifications, referrals, marketplace, academy, councils, and
   expanded operations tooling.

The product phase gates are defined in [the roadmap](../product/ROADMAP.md). Technical
readiness does not override legal, safety, customer-demand, or operational gates.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Package purchases appear to buy authority or income | independent role grants; separate entitlement and value models; reviewed copy |
| Low-quality or collusive validation | blind/conflict-aware assignment, gold items, consensus, audit sampling, appeals |
| Sensitive data is reused beyond permission | versioned purpose consent, lineage, release coverage checks, rights workflows |
| Duplicate rewards or balances drift | immutable ledgers, idempotent source events, transactional outbox, reconciliation |
| Geographic leaders over-access member data | scoped RBAC/ABAC, aggregate views, suppression, access audits |
| A digital profile is mistaken for a physical asset | separate entities/contracts and explicit availability/ownership language |
| Premature distributed architecture slows delivery | modular monolith, owned schemas, events only where reliability requires them |
