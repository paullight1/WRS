# Phase 3.7 — Route and API Authorization

## Goal
Prevent direct-route and direct-API access from bypassing authentication, verification or role requirements.

## Implementation
- Add public, authenticated, verified, KYC-required and admin route policies.
- Treat frontend route guards as UX only; enforce authorization again on every backend operation.
- Verify resource ownership for robots, transactions, deployments, uploads and settings.
- Return safe 401/403/not-found behavior without leaking other users' resources.
- Remove fallback behavior that displays another/default record for unknown IDs.

## Tests / Evidence
- Unauthenticated access to protected pages/APIs fails.
- User A cannot read/change User B resources by ID substitution.
- Role/KYC gates are tested independently of UI visibility.

## Exit gate
Authorization is server-enforced for every protected resource and direct URL/API manipulation cannot bypass it.