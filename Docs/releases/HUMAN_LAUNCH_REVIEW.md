# WRS Human Launch Review

This document is a **sign-off template**, not an approval. Keep every row `EXTERNAL BLOCKER` or `FAIL` until a named reviewer records evidence and changes it to `PASS` for the exact release candidate.

Release candidate commit: `<sha>`
Staging deployment: `<deployment/reference>`
Review date (UTC): `<timestamp>`

Allowed status values: `PASS` · `FAIL` · `EXTERNAL BLOCKER`

## Accessibility / WCAG

Status: `EXTERNAL BLOCKER`

Reviewer: `<name/role>`
Evidence: `<link/reference>`

Required review:

- Manual WCAG 2.1 AA review in addition to automated Axe coverage.
- Keyboard-only navigation through registration, login, home, wallet, training/data, deployment, marketplace, settings/support and deletion recovery.
- Screen-reader review of forms, alerts, modal/drawer interactions, status/financial information and validation errors.
- Zoom/text resize and representative touch-target/contrast review.
- Reduced-motion behavior and 3D fallbacks.
- Confirm no blocking accessibility issue remains P0/P1.

## Privacy, biometric & data-processing review

Status: `EXTERNAL BLOCKER`

Reviewer: `<privacy/legal owner>`
Evidence: `<link/reference>`

Required review:

- Consent wording/policy versions for voice, face, movement, documents and other contribution categories.
- Purpose limitation between robot personalization, dataset contribution and research licensing.
- Withdrawal of consent and future-use blocking.
- Data export content and privacy boundaries.
- Sensitive-data deletion timelines, worker behavior and retained legal/audit evidence.
- Biometric/media storage, scanning, access controls, processor/vendor agreements and data residency considerations.
- Dataset licensing and contributor allocation policy.
- Confirm the implemented retention schedule is compatible with applicable policy/legal obligations.

## Payments, wallet & payout compliance review

Status: `EXTERNAL BLOCKER`

Reviewer: `<finance/compliance owner>`
Evidence: `<link/reference>`

Required review:

- Paystack merchant/account readiness and applicable terms.
- Package pricing/currency presentation.
- Refund, chargeback/reversal and customer-support policy.
- Wallet/accounting characterization and whether any licensing/regulatory requirement applies to stored balances or payouts.
- Withdrawal KYC requirements, limits, payout destination controls and fraud operations.
- Reconciliation ownership and exception/escalation handling.
- Tax/invoice/receipt requirements for target markets.

## Terms, privacy notice & retention review

Status: `EXTERNAL BLOCKER`

Reviewer: `<legal owner>`
Evidence: `<link/reference>`

Required review:

- Published Terms of Service and Privacy Notice match the implemented product.
- Consent-policy URLs/version identifiers map to the notices shown to users.
- Account deletion/cooling-period language is accurate.
- Financial and AI/data revenue descriptions do not promise unsupported outcomes.
- Data retention and audit retention schedules are documented.
- Support/contact/escalation details are valid.

## Security & operations review

Status: `EXTERNAL BLOCKER`

Reviewer: `<security/operations owner>`
Evidence: `<link/reference>`

Required review:

- Incident and alert-routing drill completed.
- Admin/operator access and MFA enforcement reviewed.
- Production secrets/keys are environment-scoped and rotated from staging.
- Break-glass process documented and auditable.
- Malware scanner/private storage/deletion worker operational ownership assigned.
- Payment, reconciliation, privacy and deployment queues have named owners.

## Release ownership

Release owner: `<name>`
Rollback owner: `<name>`
Incident commander/on-call owner: `<name>`
Database recovery owner: `<name>`
Payments/reconciliation owner: `<name>`
Privacy/data owner: `<name>`

Status: `EXTERNAL BLOCKER`
Evidence: `<release ticket/change record>`

All owners must acknowledge the release/rollback/incident runbooks before GO.

## Final human-review decision

Overall status: `EXTERNAL BLOCKER`

Reviewer/approver: `<name/role>`
Evidence package: `<reference>`
Decision timestamp (UTC): `<timestamp>`

This document may be marked `PASS` only when every required section above is `PASS`, there is no unresolved P0/P1 issue, and the review applies to the same commit/deployment evaluated by the final Plan 11 GO gate. Any missing reviewer/evidence keeps the release **NO-GO**.
