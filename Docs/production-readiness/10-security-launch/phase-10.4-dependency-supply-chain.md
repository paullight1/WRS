# Phase 10.4 — Dependency and Supply-Chain Security

## Goal
Make dependency, secret and build-supply-chain risk visible and continuously checked.

## Implementation
- Add dependency vulnerability audit and automated update workflow with review/tests.
- Enable secret scanning/pre-commit or CI detection for leaked credentials.
- Add static analysis/security scanning appropriate to JavaScript/TypeScript/backend stack.
- Pin/lock dependencies and review postinstall/build scripts for sensitive infrastructure.
- Scan container images if containers are introduced.
- Document emergency dependency patch procedure.

## Tests / Evidence
- CI fails on configured severity thresholds or creates a tracked exception with owner/expiry.
- Seeded fake secret is detected in a safe test.
- Clean install uses lockfile deterministically.

## Exit gate
Known high/critical exploitable dependency or leaked-secret findings cannot silently pass the release pipeline.