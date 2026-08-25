# WRS Production Track 3: Deployment and Robot Operations

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Ten isolated agents are expected, with operational safety review before integration.

**Goal:** Convert deployment opportunities and requests into a real, safe, auditable operating system for digital and physical robot work without making unsupported claims about active deployments.

**Architecture:** Separate opportunity discovery, request approval, contract execution, device/robot dispatch, telemetry, safety, and settlement. Use a state machine with explicit human and automated gates. Physical operations remain disabled until device identity, custody, insurance, safety case, operator assignment, customer contract, and emergency controls are verified.

**Tech Stack:** React 18/Vite, Node.js API, PostgreSQL, provider adapters, event/outbox pattern, telemetry ingestion, queue workers, immutable audit log, operational dashboard.

## Global Constraints

- A deployment request is not an active deployment.
- A simulation must be labelled as simulation in API responses and UI.
- No robot may be dispatched without an approved contract, device identity, safety gate, and operator/custodian assignment.
- Telemetry is append-only and must be access-controlled; sensitive location data requires retention rules.
- Emergency stop and incident response take priority over revenue or availability.
- Every state transition has an actor, reason, timestamp, request ID, and audit event.

## Current Baseline

- Deployment API: `server/deployments.js`, routes in `server/app.js`
- Deployment screens: `src/screens/Deploy.jsx`, `DeploymentDetails.jsx`, `ActiveDeployment.jsx`
- Robot profile screens: `src/screens/MyRobot.jsx`, `RobotPassport.jsx`
- Current behavior: opportunity catalogue and request records work; all physical dispatch, telemetry, contracts, safety, and settlement are unavailable.

## Parallel Execution Model

Agents 1–10 work in isolated branches. Agent 2 owns the canonical deployment state machine. Agents 3–6 must consume its events rather than inventing state transitions. Agent 5 has release authority for safety gates. Integration requires a staging simulation before any provider production credential is enabled.

## Agent Workstreams

### Agent 1 — Opportunity catalogue and eligibility

**Own:** `server/deployments/`, opportunity migrations, `/deployments/opportunities`, `Deploy.jsx`.

**Deliver:** versioned opportunity catalogue; customer/industry metadata; digital versus physical classification; geographic/operational constraints; package/tier eligibility; application windows; availability status.

**Required tests:** inactive opportunities are hidden; client cannot bypass tier or geography rules; catalogue versions remain stable for existing requests; physical opportunities cannot appear available without a provider health check.

**Acceptance:** Every opportunity declares whether it is simulation, digital service, or physical operation and has a responsible operator.

### Agent 2 — Deployment request state machine

**Own:** request schema and transitions, `server/deployments.js`, request routes, `DeploymentDetails.jsx`, `ActiveDeployment.jsx`.

**Deliver:** states `draft`, `requested`, `screening`, `approved`, `contract_pending`, `scheduled`, `active`, `paused`, `completed`, `cancelled`, `rejected`, `incident`; transition guards; idempotency; cancellation rules; history endpoint.

**Required tests:** invalid transition fails; duplicate request replays safely; unauthorized user cannot read or transition another request; active state requires all operational gates; cancellation records reason.

**Acceptance:** The UI never shows active physical deployment unless the server state and all gate evidence confirm it.

### Agent 3 — Dispatch and provider adapter

**Own:** `server/operations/dispatch/`, provider interface, queue jobs, dispatch callbacks.

**Deliver:** provider-neutral dispatch contract; idempotent schedule/cancel/resume commands; callback signature verification; timeout/retry policy; operator assignment; dispatch reconciliation.

**Required tests:** duplicate dispatch is safe; forged callback is rejected; provider timeout does not mark active; cancellation is retry-safe; orphaned provider job is detected.

**Acceptance:** A sandbox provider can schedule and cancel a digital deployment with observable command and callback history.

### Agent 4 — Device identity, custody, and robot link

**Own:** `server/operations/devices/`, device registry, certificates/keys, robot link, passport integration.

**Deliver:** immutable device identity; ownership/custody chain; signed device registration; firmware/version status; online/offline health; verified robot-to-request binding.

**Required tests:** unknown device cannot connect; stolen/revoked device is blocked; device cannot be rebound without authorization; expired certificate fails; custody change is audited.

**Acceptance:** A deployment cannot become active without a verified device or an explicitly classified digital-only execution path.

### Agent 5 — Safety case and incident control

**Own:** safety policies, gate service, emergency controls, incident schema, operator runbook.

**Deliver:** preflight checklist; geofence/allowed-operation rules; human approval; emergency stop; pause/resume; incident severity; escalation; post-incident review; safety audit.

**Required tests:** failed preflight blocks activation; emergency stop overrides scheduling; unsafe telemetry pauses work; incident escalation notifies the correct operator; no revenue is settled during an unresolved incident.

**Acceptance:** Safety gates are enforced server-side and tested under failure, not implemented as UI buttons.

### Agent 6 — Telemetry, performance, and operational analytics

**Own:** `server/operations/telemetry/`, ingestion pipeline, retention policy, robot analytics API, `MyRobot.jsx`.

**Deliver:** authenticated telemetry ingestion; schema/version; time-series storage; health/performance/safety metrics; stale-data detection; redaction; retention; dashboards.

**Required tests:** unauthenticated telemetry fails; out-of-order events are handled; duplicate event IDs are idempotent; stale telemetry cannot report healthy; retention deletes data according to policy.

**Acceptance:** Robot analytics show measured server telemetry with timestamps and freshness, never static performance claims.

### Agent 7 — Contracts, work logs, and settlement interface

**Own:** `server/operations/contracts/`, work log schema, settlement events, deployment revenue boundary.

**Deliver:** customer/operator contract records; accepted scope; rate-card version; hours/tasks evidence; approval; disputes; settlement/reversal events.

**Required tests:** settlement requires completed work and approved evidence; duplicate settlement is safe; dispute freezes payout; contract changes do not rewrite historical logs.

**Acceptance:** Deployment revenue is never estimated as settled money and cannot bypass the financial ledger track.

### Agent 8 — Deployment UX and truthfulness

**Own:** `Deploy.jsx`, `DeploymentDetails.jsx`, `ActiveDeployment.jsx`, `RobotPassport.jsx`, shared state components.

**Deliver:** state-specific UI; provider health; safety gate summary; request history; cancellation; incident messaging; accessible empty/loading/error states; simulation labels.

**Required tests:** each server state renders the correct label; provider outage does not show active; unsupported physical action is disabled; refresh preserves state from API.

**Acceptance:** A user can distinguish opportunity, request, approval, schedule, simulation, active operation, incident, and settlement status.

### Agent 9 — Operations/admin control plane

**Own:** `server/admin/operations/`, reviewer/operator roles, audit queries, manual actions, runbooks.

**Deliver:** least-privilege roles; queue views; manual approval/rejection; incident controls; audit search; customer communication hooks; dual control for dangerous actions.

**Required tests:** contributor cannot access operator endpoints; dangerous action requires second approval; every manual change has reason; audit search is tenant-scoped.

**Acceptance:** Operations can manage failures without direct database edits or hidden admin backdoors.

### Agent 10 — Operational simulation and release audit

**Own:** staging simulator, end-to-end tests, load/failure tests, safety sign-off, production runbook.

**Deliver:** simulated request → approval → schedule → telemetry → pause → incident → resume/cancel → completion flow; provider outage drills; rollback and emergency procedures.

**Required tests:** duplicate callbacks, queue retry, telemetry outage, emergency stop, stale device, contract dispute, and database rollback.

**Acceptance:** Simulation passes with all states visible and no physical-availability claims; production activation remains feature-flagged until safety and insurance evidence is approved.

## Track Release Gate

- [ ] Opportunity and request states are server-owned and audited.
- [ ] Digital and physical deployments are explicitly separated.
- [ ] Dispatch/provider callbacks are signed and idempotent.
- [ ] Device identity, custody, and telemetry are verified.
- [ ] Safety preflight, pause, emergency stop, and incident response work.
- [ ] Contracts, work evidence, disputes, and settlement are integrated.
- [ ] Operations has least-privilege controls and runbooks.
- [ ] Full simulation and failure drills pass before production flags are enabled.
