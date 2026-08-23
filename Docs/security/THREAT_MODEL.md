# WRS Production Threat Model

## Scope and trust boundaries

WRS crosses five high-risk trust boundaries: the browser and public internet, cookie-authenticated Vercel Functions, Supabase Auth/PostgreSQL/private Storage, payment/payout providers, and privileged internal/operator workflows. AI/data contribution and robot/deployment pipelines are treated as untrusted inputs until server verification completes.

Critical assets are account identity and sessions, payment and wallet ledger evidence, payout destinations, private voice/face/movement and uploaded data, robot ownership/configuration, deployment contracts/work evidence, reward/referral integrity, staff permissions, secrets and audit logs.

## P0/P1 threat register

| Severity | Threat | Preventive controls | Detective controls | Recovery controls | Owner |
| --- | --- | --- | --- | --- | --- |
| P0 | Account takeover / session theft | HTTP-only Secure SameSite cookies, provider verification, MFA, session metadata revocation, CSRF same-origin checks, rate limits | security events, auth failure telemetry, correlation IDs | revoke sessions/factors, password recovery, incident runbook | Security owner |
| P0 | Payment or withdrawal fraud | server-owned prices, provider verification, double-entry ledger, KYC, verified payout methods, idempotency | reconciliation, webhook/provider-event audit, wallet invariant tests | compensating ledger entries, withdrawal reversal, provider escalation | Finance owner |
| P0 | IDOR / cross-user resource access | session-derived user IDs, ownership checks/RLS/service-role RPCs, least-privilege operator permissions | authorization regression tests, operations audit | revoke session/role, incident containment and data-access review | Security owner |
| P0 | Biometric/private-data theft | purpose/version consent, server-owned private paths, signed grants, scan lifecycle, deletion/export workflows | storage/data audit state and deletion worker telemetry | revoke grants, sweep storage, durable deletion queue, breach procedure | Privacy owner |
| P1 | Malicious upload | allowlisted MIME/size, private signed upload, scan status required before approval/licensing | scan failures and support/data upload telemetry | reject/tombstone object, revoke dataset inclusion | Data owner |
| P1 | Data poisoning / fabricated quality | server-authoritative quality dimensions, reviewer evidence, approved-clean lifecycle | reviewer agreement and quality audit records | reject/re-review submissions and downstream datasets | Data owner |
| P1 | Event/referral/reward abuse | hashed expiring codes, distributed rate limits, one-user-per-event, paid activation review window, append-only points | redemption/referral/audit records | reverse point event, suspend abusive account, risk review | Risk owner |
| P0 | Admin/operator compromise | granular RBAC, recent MFA for security/finance actions, reason-required mutations, no self-service role escalation | append-only operations audit and security telemetry | revoke roles/sessions, rotate secrets, investigate all operator actions | Security owner |
| P1 | Provider/database/storage outage | bounded upstream timeout, fail-closed APIs, idempotent domain operations, durable queues | latency/error telemetry and SLO alerts | retry durable work, provider failover/restore procedures, rollback | Operations owner |
| P1 | Secret or supply-chain compromise | lockfile, dependency audit, Dependabot, repository secret scan, server-only secrets | CI security gate and provider audit logs | rotate/revoke key, emergency patch/redeploy | Security owner |

## Assumptions and residual risk

No browser value is authoritative for money, identity, entitlement, data approval, deployment completion, reward award or staff permission. Service-role credentials must exist only in managed server environment secrets. Production launch remains NO-GO while the launch decision matrix contains an unresolved P0/P1 `FAIL` or required `EXTERNAL BLOCKER`.

Residual live-provider risks—real payment sandbox behavior, production Supabase restore, malware-scanning service effectiveness, alert delivery, jurisdiction-specific legal/privacy/compliance review and production rollback—require named operational owners and live evidence before enabling those critical capabilities.

## Review triggers

Re-run this threat review when WRS adds a new payment/payout provider, external AI processor, storage/provider trust boundary, role/permission, sensitive-data category, deployment settlement path, or public marketplace/reward mechanism.
