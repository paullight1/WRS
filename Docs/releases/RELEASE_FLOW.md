# WRS Environment and Release Flow

## Environment boundaries

| Environment | Purpose | Data | Credentials/providers |
| --- | --- | --- | --- |
| Development | local feature work | synthetic/local only | development credentials only |
| Preview | pull-request browser/API verification | synthetic disposable accounts | preview credentials, never production secrets |
| Staging | production-like migrations, E2E, provider sandbox and recovery drills | synthetic seeded dataset | separate staging/Sandbox credentials and storage |
| Production | approved user traffic | production authoritative data | production-only managed credentials/providers/storage |

Production credentials must be separate from development, preview and staging. Copying sensitive production data into staging is prohibited by default; use synthetic fixtures or separately approved anonymized data.

## Promotion sequence

1. Pull request passes lint, strict typecheck, formatting, contracts, unit/integration, Playwright, dependency/secret security gates and all applicable PostgreSQL invariant gates.
2. Apply migrations to staging in repository order. Migrations must be forward-compatible with the currently deployed application during rollout or use an explicitly coordinated maintenance boundary.
3. Deploy a Vercel preview/staging build and run critical staging E2E: auth/MFA, payment sandbox + webhook/idempotency, wallet/reconciliation, consent/upload/delete/export, deployment, rewards/referrals, profile/support/operations and accessibility/header checks.
4. Review observability, performance budgets, error rate and migration health.
5. Release owner records the evidence in the launch/release record.
6. Promote the already-tested deployment to production where possible rather than rebuilding unverified source.

## Rollback

For application-only regression, use the hosting platform's verified previous deployment/rollback mechanism. For schema changes, prefer backward-compatible application rollback; never automatically reverse a data migration that would discard writes. A destructive rollback requires a reviewed restore/migration plan and current backup evidence.

After rollback, verify login/session, wallet ledger integrity, critical reads/writes, queues and provider callbacks. Keep failed deployment evidence available for investigation.

## Migration safety

Schema migration order is deterministic from `supabase/migrations`. The PostgreSQL gates recreate the full chain from a clean database on every relevant change. High-risk production migrations require a restore point and an explicit owner.

## Release ownership

A production promotion requires one named release owner and one rollback owner. The release owner may not mark a `FAIL` or required `EXTERNAL BLOCKER` as accepted evidence merely to ship. P0/P1 launch blockers remain NO-GO.

## External activation

The final staging deployment, production provider credentials, sandbox/live payment validation, alert routing and actual hosting rollback exercise require connected production infrastructure. Until exercised, the launch matrix records them as `EXTERNAL BLOCKER` rather than simulated PASS evidence.
