# Phase 9.6 — Administrative Operations Console

## Goal
Provide controlled staff workflows for production operations instead of ad-hoc database intervention.

## Implementation
- Define RBAC roles/permissions for support, KYC, finance, data review, deployment operations, fraud/risk and administrators.
- Build operator views/actions for users, verification, payments/withdrawals, deployments, data review, referrals/rewards, support and moderation as required.
- Require reason codes and immutable audit events for sensitive staff mutations.
- Add step-up authentication for high-risk financial/security actions.
- Avoid exposing secrets/full sensitive data by default; implement least-privilege views.

## Tests / Evidence
- Permission matrix tests each role against allowed/denied operations.
- Staff cannot escalate their own role through application APIs.
- Sensitive action is attributable to an authenticated operator and reason.

## Exit gate
Every production workflow that requires human intervention has a documented least-privilege operator path and audit trail.