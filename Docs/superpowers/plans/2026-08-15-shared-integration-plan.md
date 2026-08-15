# WRS Shared Product Surfaces Implementation Plan

> **For agentic workers:** This is the main integration plan. It owns shared client/server contracts and must be applied after independent tracks are reviewed.

**Goal:** Integrate the twelve annotated surfaces: identity-safe onboarding, package/entitlement messaging, functional leaderboard, launch-aware wallet, and multi-step withdrawal UX.

**Architecture:** Keep the server as the authority for identity, entitlements, mining rankings, RBC balances, conversion rates, and withdrawal state. Build focused client components around existing API contracts and use explicit unavailable/locked states for provider-dependent behavior.

**Tech Stack:** React, existing UI primitives, Node HTTP API, Vite build, Node test runner.

## Global Constraints

- Default robot naming format is `wrs-[user-name]`, normalized and unique server-side.
- Package selection during onboarding does not fake paid access; active entitlements unlock mining without an extra blocker.
- Available, pending, and locked RBC labels must match server accounting.
- Rates are published at launch; no conversion rate or payout is invented client-side.
- Withdrawal mutations retain quote expiry, idempotency, masking, and manual-review safeguards.

## File Map

- Modify: `src/screens/Onboarding.jsx`, `server/app.js`, and robot persistence/validation helpers for default names and uniqueness.
- Modify: `src/screens/Packages.jsx` for catalogue-vs-onboarding messaging.
- Modify: `src/screens/mining/Leaderboard.jsx` and `server/mining.js` for category metrics and response normalization.
- Modify: `src/lib/miningApi.js`, `src/components/mining/ConversionQuote.jsx`, `src/components/mining/WithdrawalForm.jsx`, and `src/screens/mining/Wallet.jsx` for currencies, explanations, and wizard flow.
- Test: existing onboarding/mining/rbc suites plus focused utility/API tests.

### Task 1: Identity and entitlement messaging

- [ ] Derive a normalized `wrs-[user-name]` default from authenticated user display/username data, with a safe fallback.
- [ ] Make server persistence collision-safe and preserve existing user-owned names.
- [ ] Update package catalogue copy and active-entitlement navigation so paid users can open mining without an onboarding blocker.
- [ ] Add regression tests for name normalization, uniqueness, and active entitlement access.

### Task 2: Leaderboard contract

- [ ] Map server fields (`profile`, `robot`, `rbcBalance`, `miningPower`, `contributionScore`, `country`) into correct category-specific labels and metrics.
- [ ] Verify all seven category tabs request the correct category and preserve empty/error/retry states.
- [ ] Add API/UI-facing tests for all categories and the current-user marker.

### Task 3: Wallet flow

- [ ] Add a stable destination-currency allowlist and retain server-published-rate gating for quote creation.
- [ ] Change unavailable-rate copy to launch-specific language.
- [ ] Replace the long withdrawal form with a four-step modal/dialog: amount, currency/quote, bank details, review.
- [ ] Add Available/Pending/Locked explanation copy and display locked balance from the server.
- [ ] Add component/utility tests for validation, currency options, step transitions, and payload integrity.

### Task 4: Integration verification

- [ ] Wire independent track routes without duplicate registration.
- [ ] Run the full project check, build, security audit, and diff checks.
- [ ] Manually smoke-test all twelve annotated routes with empty, success, validation, and provider-unavailable states.

