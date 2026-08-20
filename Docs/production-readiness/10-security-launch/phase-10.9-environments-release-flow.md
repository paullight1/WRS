# Phase 10.9 — Environments and Release Flow

## Goal
Separate development, preview, staging and production so verification occurs before user-facing release.

## Implementation
- Define local/dev, pull-request preview, staging and production configuration/data/service boundaries.
- Use separate production credentials/providers/storage from non-production.
- Seed staging with synthetic test accounts/data; never rely on copied sensitive production data by default.
- Define migration ordering, backward compatibility, deployment promotion and rollback.
- Require approved CI gates and staging E2E before production promotion.

## Tests / Evidence
- Environment secrets/data cannot accidentally cross boundaries.
- Staging deployment runs critical E2E and migration checks.
- Rollback procedure is exercised on a representative release.

## Exit gate
Every production release has passed a production-like staging path and can be rolled back without improvisation.