# WRS Production SLOs and Alerts

These are launch targets for enabled authoritative services. Every alert must include a request/correlation ID, owner and linked incident runbook. Telemetry must never include raw passwords, tokens, email/phone, financial account details or biometric payloads.

| Journey | SLO | Alert condition | Owner |
| --- | --- | --- | --- |
| Authentication/session | 99.9% successful valid-session checks; p95 < 750 ms | 5-minute error rate > 2% or p95 > 1.5 s | Security |
| Registration/verification/MFA | 99.5% server availability excluding provider-declared outage | error rate > 3% for 10 min | Security |
| Payment/webhook fulfillment | 99.95% accepted verified events recorded idempotently | verified provider event not fulfilled/reconciled within 5 min | Finance |
| Wallet reads | 99.9%; p95 < 1 s | error > 1% or ledger invariant/reconciliation mismatch | Finance |
| Withdrawal processing | no silent loss; every request reaches terminal/retry state | stuck pending beyond provider SLA or reversal failure | Finance |
| Private upload/scan | 99.5% signed-grant creation; no unscanned asset approved | grant/scan errors > 3% for 10 min or scan backlog age > 15 min | Data/Privacy |
| Deletion/export workers | no request silently abandoned | eligible job unclaimed > 15 min or 3 consecutive failures | Privacy |
| Deployment request/work | 99.5% API availability; no unverified work settlement | state/settlement failure > 2% or telemetry backlog > 10 min | Deployment |
| Support/operations | 99.5% case/API availability | operator/support API errors > 3% for 10 min | Operations |

## Alert routing

Production routing must send P0/P1 alerts to an on-call destination and record acknowledgement. Dashboard-only visibility is insufficient. The exact Vercel Drain/alert provider and escalation destinations are an external activation gate recorded in the launch decision until configured and exercised.
