# Phase 5.2 — Payment Provider Integration

## Goal
Replace simulated checkout authorization with a real provider-backed payment lifecycle.

## Implementation
- Select/integrate approved payment provider(s) for target markets.
- Create payment intents server-side and return only safe client configuration.
- Verify signed provider callbacks/webhooks before changing financial state.
- Map provider pending/succeeded/failed/cancelled states to WRS transaction states.
- Keep card data out of WRS systems unless PCI scope is intentionally accepted.
- Remove static crypto/bank instructions unless an operationally reconciled flow exists.

## Tests / Evidence
- Sandbox success, decline, timeout, cancellation and pending cases.
- Forged webhook/signature fails.
- Browser redirect alone cannot activate a package.

## Exit gate
A WRS payment succeeds only after provider-verified server evidence is recorded.