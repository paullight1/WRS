# Plan 7 Verification — Deployment & Robot Work Engine

## Code-side status

**PASS — production-ready for the implemented code boundary on commit `9a8dcc2704f7b3837b8498552fedf5d63fa0d0a8`.**

Live customer demand, operator matching, independent work verification and real production settlement remain gated on external production configuration and operating evidence. This certification does not claim that those external systems are already live.

## Final evidence

- WRS Quality Gate run `32592936670`: lint, strict TypeScript, formatting, Plans 1–7 contracts, production build, unit/integration, desktop/mobile Playwright and dependency audit — passed.
- Plan 7 Deployment Database Gate run `32592936624`: PostgreSQL 17 applied the full migration chain and passed deployment eligibility, ownership, request idempotency, opportunity capacity, matching, immutable contract terms, acceptance, state transitions, work evidence, verification, settlement, wallet-credit, balanced-journal and append-only invariants.
- Plans 3–4 Database Gate run `32592936640` — passed.
- Plan 5 Financial Database Gate run `32592936602` — passed.
- Plan 6 Privacy Database Gate run `32592936628` — passed.

## Adversarial hardening completed

- Opportunity eligibility is computed server-side from owned active robot state, package capability, KYC, recent data quality, availability, country, verified skills and active certifications.
- Capacity is serialized against the opportunity row so concurrent requests cannot overbook a slot.
- Request retries are resource-idempotent and global idempotency-key collisions fail closed.
- Matching rechecks eligibility and capacity before creating an offer.
- Commercial contract terms are snapshotted server-side and protected by an immutable-terms trigger.
- Contract reads explicitly verify the nested request owner server-side instead of trusting a relationship filter alone.
- Contract acceptance rechecks ownership and eligibility and permits only one concurrent scheduled/active/paused deployment per robot.
- Owner controls can start, pause, resume or cancel only permitted states. Browser routes cannot mark work verified, declare completion/failure or create settlement.
- Work logs, work verifications, state events and incidents are append-only evidence.
- Work evidence cannot be submitted before the deployment is active and client-provided earnings/verified/settled fields are ignored by design.
- Matching, work verification, system completion/failure and settlement require separate internal bearer authorization.
- Settlement is serialized on the completed deployment, uses only verified work, derives value from the accepted contract snapshot and posts a balanced Plan 5 ledger journal exactly once.
- Production deployment routes are separated from legacy demo/mock screens and use the authoritative deployment client only.

## External activation gate

Before live deployment launch, WRS still needs:

1. A dedicated production Supabase project with the certified migration chain applied and backup/restore evidence.
2. A real customer/opportunity ingestion process with accountable client records, capacity and contract templates.
3. Operator matching credentials and a documented authorization/rotation procedure for `WRS_DEPLOYMENT_OPERATOR_SECRET`.
4. An independent work-verification service/process and rotation procedure for `WRS_DEPLOYMENT_VERIFIER_SECRET`.
5. A settlement operator process and monitoring for `WRS_DEPLOYMENT_SETTLEMENT_SECRET`.
6. Staging end-to-end evidence for opportunity → request → match → contract acceptance → active work → evidence → independent verification → completion → ledger settlement → wallet projection.
7. Concurrency/load evidence for opportunity capacity and one-concurrent-deployment-per-robot under production-like PostgreSQL traffic.
8. Operational monitoring, incident escalation and reconciliation for deployment-to-ledger settlement failures.

Until those activation items are evidenced, production configuration must continue to fail closed rather than substitute demo contracts, telemetry or earnings.
