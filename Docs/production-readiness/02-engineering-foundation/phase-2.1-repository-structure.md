# Phase 2.1 — Repository Structure

## Goal
Create a maintainable production-oriented layout without rewriting the working frontend.

## Implementation
- Keep the current Vite UI intact while introducing clear boundaries for application services, tests, documentation and scripts.
- Establish `tests/unit`, `tests/integration`, `tests/e2e`, architecture/security/runbook docs and reusable validation utilities.
- Define import boundaries and ownership for UI, domain, service/API and infrastructure code.
- Document where future backend code lives if it remains in this repository; avoid premature monorepo complexity.
- Add conventions for environment configuration, fixtures and test data.

## Tests / Evidence
- Existing production build remains green after structural changes.
- Imports resolve without circular or duplicate module trees.
- Contributor documentation describes where new code and tests belong.

## Exit gate
The repository has an explicit architecture that supports testing and backend integration without destabilizing existing UI behavior.