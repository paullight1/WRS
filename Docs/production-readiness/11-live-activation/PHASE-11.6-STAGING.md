# Phase 11.6 — Production-like Staging Validation

## Goal

Validate the deployed WRS application against real staging authority/services instead of localhost mocks.

## Repository implementation

- `playwright.staging.config.js` accepts only a real HTTPS `WRS_STAGING_URL`, has no localhost fallback and does not launch a local web server.
- `scripts/staging-http-preflight.mjs` checks deployed application reachability, the anonymous authoritative session envelope and required browser security headers.
- `tests/staging/staging-smoke.spec.js` verifies public/login behavior, protected-route redirect, verified synthetic-account authentication, server session verification and a non-demo wallet route.
- `.github/workflows/plan11-staging-validation.yml` is a manual staging-only workflow using a dedicated synthetic staging account.

## Evidence to collect later

1. Deploy the exact candidate commit to the WRS staging environment.
2. Ensure all 25 Supabase migrations and read-only post-migration checks pass there.
3. Configure `WRS_STAGING_URL`, `WRS_STAGING_EMAIL` and `WRS_STAGING_PASSWORD` in the GitHub `staging` environment.
4. Run **Plan 11 Staging Validation** and retain its workflow run ID/artifacts.
5. Exercise the Paystack sandbox, sensitive-data and operational drills from Phases 11.3–11.5.
6. Measure real staging/mobile **Web Vitals**—at minimum LCP, INP and CLS—on the key user journeys rather than relying only on bundle-size budgets.
7. Repeat on representative mobile viewport/network conditions and record browser/device/network assumptions.
8. Confirm no route falls back to demo money, robot, deployment, reward, support or sensitive-data state when staging services are enabled.

## Review and improvements

- Remote Playwright is isolated from the ordinary localhost/demo E2E suite.
- The synthetic test account must already be email/phone verified; verification itself is tested separately in the authoritative identity layer and should also be exercised manually in staging.
- Anonymous `/api/auth/session` behavior is checked before login, and a protected route must redirect to login.
- The authenticated browser session is re-read from `/api/auth/session` after login to prove browser navigation did not fabricate identity state.
- Payment/private-data credentials are not passed into the browser test workflow.

## Classification

**REMOTE TEST HARNESS READY / EXTERNAL BLOCKER.**

The production-like staging workflow is complete. A deployed staging WRS URL, synthetic account, real staging authority/provider configuration and measured Web Vitals remain `EXTERNAL BLOCKER` evidence to run later. Live activation cannot become GO without a green deployed-staging run.
