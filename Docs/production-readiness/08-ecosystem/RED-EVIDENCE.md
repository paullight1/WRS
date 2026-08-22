# Plan 8 RED Evidence

## Event-code abuse protection

Adversarial review identified that authenticated event-code redemption was server-validated but lacked the distributed attempt throttling required by Phase 8.4.

A contract now requires `api/rewards/event-code.js` to use the existing database-backed `enforceRateLimit` boundary. This commit intentionally does not implement the limiter; its quality-gate run is the RED evidence for the regression test.
