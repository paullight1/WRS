# Production readiness gate

This repository currently contains a functional development beta, not a public-production service. The API now fails closed on weak production session secrets, applies security headers, validates CORS origins, throttles requests, and exposes server-owned state for the implemented workflows.

## Required before public launch

- Replace `server/store.js` JSON persistence with PostgreSQL or another managed transactional store. The JSON adapter is development-only and is not suitable for multi-instance deployment, backup/restore guarantees, or concurrent writers across processes.
- Configure managed secrets and rotate `WRS_SESSION_SECRET`; never use the development fallback in production.
- Integrate and verify email, SMS/OTP, and identity providers. Verification must be server-confirmed before sensitive account actions.
- Integrate a payment provider and verify signed webhooks before activating packages or writing confirmed wallet entries. Do not accept client payment success callbacks.
- Integrate object storage with private buckets, malware scanning, consent records, deletion workflows, access auditing, and retention policies before accepting voice, face, movement, or document uploads.
- Implement a human/automated review service for data submissions. `submitted` is not `approved` and must not create payable balances.
- Integrate deployment dispatch, robot telemetry, contract state, safety controls, and settlement. A deployment request is not an active physical deployment.
- Add distributed rate limiting, structured logs/metrics/traces, alerting, backups, disaster recovery drills, dependency scanning, and CI/CD promotion controls.

## Current functional contracts

- Authenticated robot setup is persisted and owner-scoped.
- Training modules expose server-owned lock/completion state.
- Data tasks support owner-scoped accept/submit state with tier checks and idempotency.
- Deployment opportunities and requests are server-owned and labelled simulation until an operational provider exists.
- Wallet reads distinguish confirmed and pending ledger values; deposits and withdrawals are unavailable without a provider.
- Mining progress requires a server-created submitted contribution and cannot be advanced by an arbitrary client increment.

## Release checklist

```text
[ ] production environment uses managed PostgreSQL
[ ] all provider credentials exist in the secret manager
[ ] webhook signatures and replay protection tested
[ ] email/SMS/identity verification tested end-to-end
[ ] private object storage and deletion/audit jobs tested
[ ] review and settlement jobs observable and retry-safe
[ ] rate limits are distributed and alerting is configured
[ ] backups restored successfully in a staging drill
[ ] npm run test:api
[ ] npm run build
```
