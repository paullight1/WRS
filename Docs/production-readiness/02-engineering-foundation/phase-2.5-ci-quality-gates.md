# Phase 2.5 — CI Quality Gates

## Goal
Prevent known-bad code from reaching the default branch or production deployment.

## Implementation
- Add GitHub Actions for clean install, lint, typecheck, unit tests, integration tests, E2E tests, build and dependency/security checks.
- Cache dependencies safely without masking lockfile changes.
- Separate fast PR checks from slower browser/security jobs while keeping required gates meaningful.
- Upload test reports and browser traces on failures.
- Configure branch protection/required checks once the baseline is stable.

## Tests / Evidence
- Deliberately failing test/lint/typecheck/build changes block CI.
- A clean checkout reproduces the pipeline.
- Deployment starts only after the agreed required checks succeed.

## Exit gate
The default branch cannot accept or deploy a change that fails the production-hardening baseline.