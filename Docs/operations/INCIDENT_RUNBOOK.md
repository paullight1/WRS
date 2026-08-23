# WRS Incident Runbook

## Severity

- **SEV-0 / P0:** active account takeover, unauthorized money movement, ledger corruption, sensitive-data exposure, admin compromise, or production-wide critical outage. Stop affected writes/feature flags, page Security + Operations + owning domain immediately.
- **SEV-1 / P1:** material degradation, provider outage, stuck deletion/withdrawal/settlement queues, abuse campaign, or integrity risk with no confirmed P0 impact. Owner acknowledges within the on-call target and begins containment.
- **SEV-2:** limited non-critical degradation with a safe workaround.

## First response

1. Capture timestamp, deployment, route, request/correlation ID and affected domain without copying secrets or user payloads into chat/tickets.
2. Confirm whether the symptom is authentication, finance, privacy/storage, deployment, ecosystem, support/operations or platform-wide.
3. Contain before repairing: disable the affected authoritative action, revoke sessions/roles/keys when relevant, or place the feature read-only/fail-closed.
4. Preserve append-only security, ledger, provider-event and operations audit evidence.
5. Escalate to the named owner from `SLOS.md`; P0 finance/privacy/security incidents require the corresponding domain owner plus Operations.

## Domain playbooks

### Authentication / admin compromise
Revoke user/operator sessions, disable compromised factors/roles, rotate affected secrets, inspect security and operations audit events, then restore access through verified recovery only.

### Payment / wallet / withdrawal
Disable new high-risk writes if ledger/provider truth is uncertain. Reconcile provider events against WRS transactions. Never edit balances; use compensating ledger entries after verified provider evidence.

### Sensitive data / malicious upload
Stop approval/licensing for affected assets, revoke signed grants where possible, isolate/tombstone objects, run storage deletion workflow and evaluate notification/legal obligations.

### Database/storage outage
Keep high-risk writes fail-closed. Durable queues may retry only after dependency health returns. Validate migrations/invariants and restore checks before reopening writes.

### Deployment/reward/referral abuse
Pause affected settlement/redemption paths, preserve telemetry/evidence, suspend abusive accounts where justified, and use reversal/audit mechanisms rather than deleting history.

## Communication and escalation

Every P0/P1 incident has one incident owner, one technical lead and a timeline. Customer/status communication must state verified impact only. Legal/privacy/compliance escalation is mandatory for suspected personal-data exposure or regulated financial impact.

## Recovery and closure

Before closure: verify the original failing journey, integrity invariants, queues/backlogs and alert recovery; document root cause, corrective action, evidence links and follow-up owner. A rollback or hotfix is not closure until the production symptom and data integrity are re-verified.
