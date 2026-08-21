# Phase 2.4 — Browser E2E Baseline

## Goal
Verify the user journeys WRS claims to support in a real browser rather than only through component inspection.

## Implementation
- Add Playwright with desktop and representative mobile projects.
- Cover landing → register → verify → onboarding → home; login; robot; training; deploy; wallet; package/checkout; settings/privacy.
- Add accessibility-friendly selectors and stable test IDs only where semantic selectors are insufficient.
- Control seeded test data and environment state.
- Capture traces/screenshots for failed CI runs.

## Tests / Evidence
- Critical routes load without console/page errors.
- Navigation, direct-route access, form validation, failure states and persistence are exercised.
- Mobile viewport verifies bottom navigation and touch-oriented layouts.

## Exit gate
Every critical customer journey has at least one repeatable browser test that fails when the journey is broken.