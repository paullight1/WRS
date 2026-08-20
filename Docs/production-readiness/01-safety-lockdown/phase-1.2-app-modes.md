# Phase 1.2 — Application Modes

## Goal
Make demo, staging and production behavior explicit so mock functionality cannot accidentally masquerade as live behavior.

## Implementation
- Introduce validated environment configuration for `demo`, `staging`, and `production`.
- Centralize feature-mode checks rather than scattering `import.meta.env` conditions across screens.
- Fail startup/build when production configuration is incomplete or invalid.
- In demo mode, allow safe simulations only when visibly identified as demo behavior.
- In production, sensitive features default closed unless their real service is configured and healthy.

## Tests / Evidence
- Unit-test environment parsing and invalid values.
- Build all supported modes.
- Assert production mode cannot enable mock payment, mock withdrawal, mock biometric submission or mock reward redemption.

## Exit gate
A production build cannot silently fall back to demo behavior, and each environment has deterministic documented feature behavior.