# WRS Production Launch Decision

**Current decision: NO-GO for live production activation of critical transactional/sensitive features.**

WRS code can be certified independently, but production launch requires live provider, staging, operational and legal evidence that cannot be truthfully manufactured in repository tests. A `FAIL` on a P0 gate or an unresolved required `EXTERNAL BLOCKER` keeps the release NO-GO. Unready features stay disabled by the Plan 1 fail-closed runtime policy.

| Gate | Status | Evidence / blocker | Owner |
| --- | --- | --- | --- |
| Plans 1–9 code contracts/build/tests | PASS | Plan-specific verification records and green application/database gates | Engineering |
| Plan 10 final repository security/launch gate | FAIL | Plan 10 implementation/certification is in progress; must turn green before code-side sign-off | Security/Engineering |
| Authentication/authorization/MFA code | PASS | server sessions, ownership/RBAC, MFA and deletion-recovery regression suites | Security |
| Dedicated WRS production identity/database project | EXTERNAL BLOCKER | no dedicated live WRS Supabase project has been provisioned/validated in the connected account | Operations |
| Payment sandbox, webhook, idempotency, ledger and reconciliation against real provider | EXTERNAL BLOCKER | Plan 5 code/database evidence exists; real payment sandbox/webhook/reconciliation evidence is still required before real money | Finance |
| Withdrawal/payout provider production verification | EXTERNAL BLOCKER | real KYC/payout destination/provider reversal flow must be exercised | Finance |
| Consent/upload/delete/export code | PASS | Plan 6 privacy/database/application gates | Privacy |
| Private-storage malware scanning and live deletion worker | EXTERNAL BLOCKER | live storage scanner/worker and deletion alert path must be exercised before real sensitive-data collection | Privacy/Data |
| Deployment/reward/referral anti-bypass | PASS | Plans 7–8 application/database contracts including rate/idempotency/settlement controls | Deployment/Risk |
| Dependency audit and repository secret scanning | FAIL | Plan 10 security gate must complete on final head | Security |
| Automated accessibility | FAIL | axe/keyboard Plan 10 gate must complete on final head | Accessibility |
| Manual WCAG 2.1 AA review | EXTERNAL BLOCKER | keyboard-only full journey, visible focus, 200% zoom/reflow, contrast/touch targets and assistive-technology review require recorded human/staging evidence | Accessibility |
| Bundle performance budget | FAIL | Plan 10 bundle-budget gate must complete on final head | Frontend |
| Mobile staging Web Vitals | EXTERNAL BLOCKER | LCP/INP/CLS must be measured on production-like staging/representative mobile network | Frontend/Operations |
| Structured logs/redaction | PASS | centralized request/correlation IDs and redacted runtime telemetry are implemented | Operations/Security |
| Live alert routing and escalation exercise | EXTERNAL BLOCKER | Vercel Drain/monitoring destination, paging route and representative alert acknowledgement must be exercised | Operations |
| PostgreSQL migration/invariant recovery | PASS | clean PostgreSQL gates recreate and validate Plans 3–9 schemas/invariants | Database |
| Production-provider backup/restore | EXTERNAL BLOCKER | provider backup/PITR restore into staging plus integrity checks must be tested; written backup/restore procedure alone is insufficient | Database/Operations |
| Staging promotion and hosting rollback drill | EXTERNAL BLOCKER | production-like staging E2E and a representative Vercel rollback/promotion exercise are required | Release owner |
| Privacy/legal/compliance review | EXTERNAL BLOCKER | launch jurisdictions, biometric/data processing, payments/payouts, retention and user terms require actual business/legal review | Legal/Privacy |
| Release and rollback owner | EXTERNAL BLOCKER | named on-call release owner and rollback owner must be assigned for the launch window | Operations |

## Required transition to GO

1. Plan 10 repository gates become PASS on one exact commit.
2. Dedicated WRS staging/production services are provisioned with separate credentials and synthetic staging data.
3. Payment sandbox/webhook/reconciliation and payout reversal paths are exercised end-to-end.
4. Sensitive-data storage scanning, deletion worker and alert routing are exercised.
5. Staging accessibility and performance evidence meets the documented budgets.
6. Production-provider backup/restore and Vercel rollback are tested.
7. Privacy/legal/compliance review and incident/on-call ownership are recorded.
8. Re-run the full application, security and applicable database suites on the release candidate; no unresolved P0/P1 finding may remain.

No `EXTERNAL BLOCKER` in this matrix is an implicit waiver. The launch decision is updated to `GO` only after evidence is linked and an owner/date are recorded.
