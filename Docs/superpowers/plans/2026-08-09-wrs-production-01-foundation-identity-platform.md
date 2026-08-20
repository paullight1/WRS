# WRS Production Track 1: Foundation, Identity, and Platform

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. This track is designed for ten isolated agents working in separate branches or terminals, followed by one integration pass.

**Goal:** Move account creation, identity, robot ownership, entitlements, settings, persistence, and platform security from development-beta quality to a production-ready foundation.

**Architecture:** Keep the modular-monolith boundary, but replace the JSON repository with a transactional PostgreSQL repository. Domain services must own authorization and state transitions; the React client must consume versioned API contracts and never be the source of truth for identity, entitlement, or security state.

**Tech Stack:** React 18, Vite, Node.js HTTP API, PostgreSQL, parameterized SQL or a reviewed query layer, server-side sessions/tokens, managed secret storage, GitHub Actions.

## Global Constraints

- Production must never use `server/store.js` JSON persistence.
- Every authenticated mutation must be owner-scoped, validated, authorized, audited, and idempotent where retries are possible.
- Verification status is server-controlled; the client cannot mark an account verified.
- Secrets must come from a secret manager or deployment secret store; no provider secret belongs in source control.
- Production CORS, rate limits, logging, backups, and migrations must be environment-configured and fail closed.
- Do not introduce a second API style or an unreviewed ORM solely to avoid defining contracts.

## Current Baseline

- API entrypoint: `server/app.js`
- Auth: `server/auth.js`
- Configuration: `server/config.js`
- JSON repository to replace: `server/store.js`
- Seed data: `server/seed.js`
- Client API helper: `src/lib/api.js`
- Authenticated route guard: `src/components/RequireAuth.jsx`
- Account screens: `src/screens/Login.jsx`, `Register.jsx`, `Verify.jsx`, `Profile.jsx`, `Settings.jsx`
- Robot screens: `src/screens/Onboarding.jsx`, `MyRobot.jsx`, `Customize.jsx`, `RobotPassport.jsx`
- Existing verification: `npm run test:api`, `npm run build`

## Parallel Execution Model

Agents 1–10 may work in parallel only in isolated branches/worktrees. They must not edit the same migration, API contract, or screen without first agreeing on ownership. Each agent must add focused tests and return changed files, migration names, API changes, security decisions, and unresolved integration risks. The integration owner merges in dependency order: 1 → 2 → 3 → 4 → 5 → 6, then 7 → 8 → 9 → 10.

## Agent Workstreams

### Agent 1 — Transactional database and migrations

**Scope:** Replace the JSON repository with PostgreSQL while preserving a repository interface.

**Own:** `server/db/`, `server/repositories/`, `server/migrations/`, `server/store.js` adapter boundary, database test harness.

**Deliver:** migrations for users, sessions, robots, packages, entitlements, settings, audit events, idempotency records; foreign keys; unique constraints; timestamps; transaction helper; connection pooling; migration status command.

**Required tests:** concurrent writes preserve both valid mutations; duplicate email is rejected by the database; expired sessions are queryable for cleanup; rollback leaves no partial robot or entitlement record; migrations run on an empty database and a representative fixture.

**Acceptance:** The API can run against PostgreSQL with `WRS_DATABASE_URL`; no production code path reads or writes `.wrs-data.json`; all writes use transactions where more than one table changes.

### Agent 2 — Authentication and session lifecycle

**Scope:** Harden registration, login, logout, session rotation, expiration, revocation, password reset, and account lockout.

**Own:** `server/auth.js`, `server/auth-service.js`, auth routes, `src/lib/api.js`, `Login.jsx`, `Register.jsx`, `Settings.jsx`, auth tests.

**Deliver:** secure session strategy with rotation and revocation; password reset tokens with one-time use and expiry; login throttling; generic credential errors; breached-password policy; session listing/revocation for the account owner.

**Required tests:** token replay fails after logout; reset token cannot be reused; wrong credentials do not reveal account existence; concurrent login limits are enforced; password changes revoke prior sessions.

**Acceptance:** No bearer token is stored in a long-lived unsafe browser location unless the threat model explicitly accepts it; all sensitive auth actions have audit events and rate limits.

### Agent 3 — Email, phone, and identity verification

**Scope:** Replace the current pending/provider-blocked verification screens with real provider-backed workflows.

**Own:** `server/verification/`, provider adapters, verification routes, `Verify.jsx`, `Profile.jsx`, `Register.jsx`, consent copy, provider contract tests.

**Deliver:** email verification links; SMS OTP with attempt/expiry limits; identity-provider adapter; webhook/callback signature verification; verification state machine; manual review state; re-verification policy.

**Required tests:** forged callback is rejected; OTP brute force is throttled; verification transitions are monotonic and audited; unverified users cannot access gated capabilities; provider timeout is retryable without duplicate state transitions.

**Acceptance:** A real provider sandbox can complete verification end-to-end, and production access is disabled until the required verification state is server-confirmed.

### Agent 4 — Robot ownership and profile domain

**Scope:** Make robot identity, ownership, configuration, and profile fields production-grade.

**Own:** `server/robot.js`, robot repository, `/api/v1/robot`, `Onboarding.jsx`, `MyRobot.jsx`, `Customize.jsx`, `RobotPassport.jsx`.

**Deliver:** immutable robot identifier; explicit editable-field allowlist; optimistic concurrency/version field; ownership checks; change audit; profile projection; safe default configuration; deletion/deactivation behavior.

**Required tests:** user A cannot read or update user B’s robot; unknown configuration keys fail; concurrent updates return a conflict; immutable identifiers cannot be changed; audit records contain actor and request ID.

**Acceptance:** Robot data is persisted transactionally, has a documented schema, and every profile value displayed as factual comes from server state.

### Agent 5 — Packages and entitlement service

**Scope:** Replace static package assumptions with server-owned package definitions and entitlements.

**Own:** `server/packages/`, package migrations, package API routes, `Packages.jsx`, `PackageDetail.jsx`, `Onboarding.jsx`, entitlement tests.

**Deliver:** versioned package catalogue; effective-dated prices; entitlement records; tier comparison endpoint; eligibility checks shared by training, data, and deployment; package downgrade/upgrade rules.

**Required tests:** old package versions remain reproducible; a client cannot self-upgrade; locked features remain locked server-side; entitlement changes are atomic; price displayed at checkout is tied to a server package version.

**Acceptance:** Client mock data is presentation fallback only and cannot grant access, unlock a route, or change a user’s package.

### Agent 6 — Settings, privacy, and account lifecycle

**Scope:** Complete server-owned preferences, consent, export, deletion, and account deactivation.

**Own:** `server/settings.js`, `server/privacy/`, settings routes, `Settings.jsx`, `Profile.jsx`, privacy tests and policy docs.

**Deliver:** versioned consent records; purpose-specific consent; account export job; deletion request and cooling-off state; data retention policies; session/security preferences; immutable privacy audit trail.

**Required tests:** consent changes are append-only; export contains only the authenticated account’s data; deletion removes or anonymizes according to policy; revoked consent blocks new collection; deletion cannot erase required financial audit records.

**Acceptance:** Sensitive actions are either fully executable with audit evidence or clearly unavailable; no UI claims deletion/export completion before the server job completes.

### Agent 7 — API contract and validation hardening

**Scope:** Establish one documented versioned API contract for this foundation track.

**Own:** `server/app.js`, `server/validation.js`, `docs/api/`, error schema, OpenAPI or equivalent contract, contract tests.

**Deliver:** consistent response envelopes; typed validation errors; pagination; request ID propagation; idempotency semantics; authentication and authorization requirements per endpoint; deprecation policy.

**Required tests:** malformed JSON, oversized body, unknown fields, invalid enums, missing auth, stale version, duplicate idempotency key, and pagination boundaries all return documented responses.

**Acceptance:** Frontend and backend contract tests run in CI and no endpoint depends on undocumented request fields.

### Agent 8 — Security controls and abuse resistance

**Scope:** Move security from single-process beta controls to deployable production controls.

**Own:** `server/security.js`, rate-limit provider, headers/CORS configuration, security tests, dependency audit configuration.

**Deliver:** distributed rate limiting; login and verification abuse controls; CSRF strategy where cookie sessions are used; secure headers; request-size limits; input/output redaction; dependency and secret scanning.

**Required tests:** limits work across two API instances; security headers are present; disallowed origins fail; sensitive fields never appear in logs; abuse controls do not leak account existence.

**Acceptance:** Threat model covers auth, PII, sessions, provider callbacks, and account takeover. Critical findings have remediation evidence.

### Agent 9 — Deployment, observability, and recovery

**Scope:** Make the foundation operable in production.

**Own:** `.github/workflows/`, deployment configuration, health/readiness endpoints, structured logging, metrics/traces, backup scripts, runbooks.

**Deliver:** migrations during deployment; readiness checks for database and dependencies; latency/error/auth metrics; alert thresholds; backup encryption; restore drill; graceful shutdown; incident runbook.

**Required tests:** deployment fails safely when migrations fail; readiness is false when the database is unavailable; restore recreates a staging environment; SIGTERM drains requests.

**Acceptance:** Operators can detect, diagnose, roll back, and restore the service without editing data manually.

### Agent 10 — Foundation integration and release audit

**Scope:** Integrate the nine workstreams and prove the account foundation is releasable.

**Own:** cross-domain integration tests, staging seed, release checklist, `docs/production-readiness.md` updates.

**Deliver:** end-to-end registration → verification → onboarding → entitlement → settings → logout flow; migration rehearsal; security sign-off; performance baseline; rollback plan.

**Required tests:** clean-install staging smoke test; authenticated cross-user isolation; provider failure recovery; database backup/restore; `npm run test:api`; `npm run build`.

**Acceptance:** No P0/P1 identity, authorization, persistence, privacy, or migration issue remains open; production configuration fails closed when a required dependency is missing.

## Track Release Gate

- [ ] PostgreSQL migrations and rollback strategy are tested.
- [ ] Auth, verification, and password recovery work in provider sandboxes.
- [ ] Entitlements are server-owned and versioned.
- [ ] Privacy export/deletion/consent behavior is audited.
- [ ] Distributed security controls and observability are live.
- [ ] Cross-user authorization tests pass.
- [ ] Restore drill and incident runbook are complete.
- [ ] `npm run test:api`, `npm run build`, and production configuration checks pass.

