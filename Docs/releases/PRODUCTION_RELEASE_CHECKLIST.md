# WRS Production Release Checklist

A release stays **NO-GO** until every repository-controlled gate and every applicable live external gate has evidence for the exact release candidate commit.

## Repository governance

- [ ] `main` branch protection is enabled.
- [ ] Direct push to `main` is blocked.
- [ ] Force-push and branch deletion are blocked.
- [ ] Pull requests require at least one independent reviewer / second reviewer; the author does not self-approve a production release.
- [ ] Stale approvals are dismissed when release-critical code changes.
- [ ] Review conversations are resolved before merge.
- [ ] CODEOWNERS applies to API, server, Supabase migrations, workflows and release documentation.

## Mandatory repository checks

All must pass on the exact head being promoted:

- [ ] WRS Quality Gate
- [ ] Plan 10 Security and Launch Gate
- [ ] Plan 10 Recovery Gate
- [ ] Plans 3-4 Database Gate
- [ ] Plan 5 Financial Database Gate
- [ ] Plan 6 Privacy Database Gate
- [ ] Plan 7 Deployment Database Gate
- [ ] Plan 8 Ecosystem Database Gate
- [ ] Plan 9 Account Operations Database Gate
- [ ] Plan 11 live-activation contracts/preflight

## Live environment evidence

- [ ] Staging and production are separate WRS infrastructure environments.
- [ ] All 25 Supabase migrations were applied in timestamp order.
- [ ] `supabase/verification/plan11_post_migration_checks.sql` passed on staging and production.
- [ ] Live environment preflight passed with environment-specific credentials.
- [ ] Staging payment sandbox/webhook/reconciliation checks passed.
- [ ] Sensitive upload, scanner, deletion and export checks passed.
- [ ] Staging browser/API journeys passed against deployed infrastructure.
- [ ] Alert routing and incident escalation were exercised.
- [ ] Provider backup/PITR and application rollback drills were exercised.
- [ ] Manual accessibility, privacy/legal/compliance and operations reviews were signed off.

## Release decision

- [ ] The final GO matrix contains no unresolved P0/P1 issue.
- [ ] No item required for the selected release mode is `EXTERNAL BLOCKER`.
- [ ] Release owner is named.
- [ ] Rollback owner is named.
- [ ] Incident commander/on-call owner is named.
- [ ] Rollback criteria and rollback target are recorded before promotion.

If any required item is incomplete, the release remains **NO-GO** and must not be promoted or merged as the production activation commit.
