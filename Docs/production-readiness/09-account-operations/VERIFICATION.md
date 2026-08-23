# Plan 9 — Account, Support & Operations Verification

## Certified code head

`4b64c7559d09e3575a5465a31b803b19aa431a5f`

## Application evidence

WRS Quality Gate run `32620162011` completed successfully on the certified head:

- clean `npm ci`
- ESLint
- strict TypeScript typecheck
- Prettier check
- Plans 1–9 executable contract suite
- production Vite build
- unit tests
- integration tests
- Playwright E2E
- dependency audit with no reported vulnerabilities

## Database evidence

Plan 9 Account Operations Database Gate run `32620162009` completed successfully on PostgreSQL 17 after applying the full WRS migration chain. On the same head, the Plans 3–4, Plan 5, Plan 6, Plan 7 and Plan 8 database regression gates also completed successfully.

The Plan 9 invariant suite covers persisted profile/settings state, recent-MFA protection for sensitive identity and deletion actions, recoverable account deletion, session revocation and anonymization sequencing, support ownership/messages, least-privilege operator permissions, and append-only operations audit evidence.

## Adversarial review fixes included

- Pending account deletion centrally blocks ordinary authenticated APIs while preserving only explicit recovery/MFA paths.
- A real MFA step-up path supports identity-critical and deletion recovery actions without disabling MFA.
- Contact changes become unverified and return authoritative OTP challenges.
- Cross-system identity-provider/profile updates compensate on failure.
- Support cases/replies are persisted; ticket mutation is rate-limited.
- Support attachment grants are server-owned, MIME/size constrained and rate-limited.
- Operator routes use granular roles/permissions rather than an admin-only shortcut.
- High-risk operator actions require recent MFA and immutable reason-coded audit evidence.
- Production Profile, Settings, Support, deletion recovery and Operations screens are separated from demo/mock authority.

## Classification

Plan 9 is **code-side production-ready** for the implemented account/support/operations scope.

Live provider configuration, production storage malware scanning, staff assignment/operational training, jurisdiction-specific deletion/retention review and production alert routing remain Plan 10 launch/activation evidence rather than being fabricated here.
