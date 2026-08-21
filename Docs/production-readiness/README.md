# WRS Production Readiness Program

This directory converts the production-readiness audit into gateable implementation work.

## Execution rule

For every phase: acceptance criteria → failing tests → implementation → unit/integration/E2E verification → security/privacy review where relevant → fix all P0/P1 findings → production build → evidence recorded → phase complete.

A UI, toast, mock value, or successful navigation is never evidence that a transactional feature is production-ready.

## Plans

1. `01-safety-lockdown/` — 5 phases. Remove dangerous prototype behavior before deeper development.
2. `02-engineering-foundation/` — 5 phases. Testing, TypeScript, CI and quality gates.
3. `03-auth-identity/` — 8 phases. Registration, verification, sessions, OAuth, route protection and 2FA.
4. `04-robot-domain/` — 6 phases. Authoritative robot ownership, configuration, passport and XP.
5. `05-payments-wallet/` — 8 phases. Ledger, payment provider, entitlements, withdrawals and reconciliation.
6. `06-ai-data-privacy/` — 9 phases. Consent, capture, uploads, QA, deletion/export and dataset licensing.
7. `07-deployment-engine/` — 7 phases. Opportunities, eligibility, contracts, deployment state and settlement.
8. `08-ecosystem/` — 10 phases. Marketplace, rewards, event codes, academy, community and referrals.
9. `09-account-operations/` — 6 phases. Profile/settings, deletion, support, knowledge base and admin operations.
10. `10-security-launch/` — 10 phases. Threat model, security, observability, performance, accessibility and launch gates.

## Dependency order

`01 → 02 → 03 → 04 → 05/06/07 → 08 → 09 → 10`

Plans 05–07 may overlap after identity and domain persistence are stable, but money and sensitive-data work must never outrun authorization, auditing and authoritative state.

## Definition of done

Every phase file contains its own exit gate. A phase is not complete until the gate is evidenced in CI, tests, staging, or an explicit production-safe operational check as appropriate.