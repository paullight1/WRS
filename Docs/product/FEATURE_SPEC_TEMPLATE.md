# Feature: [name]

## Document control

| Field                  | Value                                            |
| ---------------------- | ------------------------------------------------ |
| Status                 | Draft / In review / Approved / Shipped / Retired |
| Phase                  | MVP / Phase 2 / Phase 3 / Future                 |
| Product owner          | [name/role]                                      |
| Engineering owner      | [name/role]                                      |
| Trust/compliance owner | [name/role]                                      |
| Last updated           | YYYY-MM-DD                                       |
| Related decisions      | [ADR/IA/other links]                             |

## Problem and outcome

- **Problem:** [user problem, with evidence]
- **Target users:** [roles and eligibility]
- **Desired outcome:** [observable change]
- **Non-goals:** [what this release will not do or imply]

## User journey

Describe entry point, preconditions, happy path, alternate path, error/retry path, appeal
or support path, and the next action after completion. State what appears when the
feature is unavailable or the user is ineligible.

## Requirements

Number requirements for traceability.

| ID    | Requirement           | Priority | Acceptance evidence           |
| ----- | --------------------- | -------- | ----------------------------- |
| F-001 | [observable behavior] | Must     | [test/demo/approved artifact] |

## Roles and permissions

List who can view, create, change, approve, reverse, export, and administer each object.
Define scope, separation of duties, expiry/suspension behavior, and audit requirements.
Link to [roles and permissions](ROLES_AND_PERMISSIONS.md).

## States and business rules

Define the state machine, valid transitions, actors, idempotency rule, concurrency
behavior, timeouts, reversals, and immutable history. Do not use a boolean when users
need to understand why something is pending, rejected, suspended, or expired.

## Data and interfaces

- entities and owning domain;
- required/optional fields and validation;
- API commands, queries, and stable error codes;
- domain/audit/analytics events;
- file types, sizes, upload/resume, and offline/low-bandwidth behavior;
- migration, retention, deletion, export, and data-lineage requirements.

## Trust, safety, and compliance

Classify data and risk. State user disclosures, consent/lawful basis, permitted and
prohibited use, fraud/abuse cases, financial wording, accessibility, localization,
minors/safeguarding, incident handling, appeal, and target-market review. Link to
[the control baseline](TRUST_SAFETY_COMPLIANCE.md).

## UX content and states

Provide canonical page title, navigation location, primary action, labels, empty,
loading, offline, partial, success, error, locked, suspended, and destructive-action
copy. Money must say estimated, pending, confirmed, promotional, or non-cash.

## Metrics and guardrails

Define the success metric, quality/safety guardrails, event names, segmentation needed
to detect disparity, and thresholds that trigger pause or rollback. Do not optimize a
volume metric without a quality counter-metric.

## Rollout and operations

Define feature flag/audience, seed/backfill, staff tooling, training/runbook, support
ownership, alerting, reconciliation, pilot limits, rollback, and phase exit gates. A
finished screen is not sufficient release evidence.

## Open decisions

Record unresolved choices, decision owner, due point, and what is blocked. Move accepted
architectural choices into an ADR and navigation/naming choices into `Docs/ia`.
