# WRS Marketplace and Event Codes Track Implementation Plan

> **For agentic workers:** Implement marketplace catalogue/admin and event-code admin/redemption as one bounded track. Avoid changing unrelated mining behavior; report shared route registration for integration.

**Goal:** Make marketplace packs and event rewards server-controlled, with admin publication and safe authenticated redemption.

**Architecture:** Add server-owned marketplace records and admin mutations, plus event-code creation/listing/redemption backed by the existing mining account/activity model. User pages read the server catalogue and event-code state; install remains explicitly unavailable until runtime services exist.

**Tech Stack:** React, existing admin shell, Node HTTP API, JSON/Postgres store abstraction, Node test runner.

## Global Constraints

- Admin mutations require trusted platform or tenant administrator roles.
- Marketplace catalogue publication is separate from binary artifact storage and runtime installation.
- Event codes are one-claim per verified account, expire, enforce claim limits, and are idempotent.
- Reward changes are atomic and server-owned; no client-side balance mutation.

## File Map

- Create: `server/marketplace.js` — catalogue reads and admin mutations.
- Create: `server/eventCodes.js` if extraction from `server/mining.js` keeps responsibilities clearer.
- Create: `src/lib/marketplaceApi.js` and/or `src/lib/eventCodesApi.js`.
- Modify: `src/screens/Marketplace.jsx`, `src/screens/rewards/EventCode.jsx`, and existing admin shell/screen.
- Create: `src/screens/admin/MarketplaceAdmin.jsx` and `src/screens/admin/EventCodeAdmin.jsx` if existing admin route conventions require separate screens.
- Test: `server/tests/marketplace.test.js` and `server/tests/event-codes.test.js`.

### Task 1: Marketplace catalogue

- [ ] Add catalogue collection initialization and public list/detail methods with search/category/status filters.
- [ ] Add admin create/update/publish/unpublish methods validating name, price, currency, category, version, compatibility tier, and status (`draft`, `published`, `coming_soon`, `archived`).
- [ ] Store a validated artifact reference/URL and publication timestamps; do not accept arbitrary executable content.
- [ ] Add tests for public visibility, coming-soon visibility, admin authorization, invalid prices/currencies, and update persistence.

### Task 2: Marketplace UI/admin

- [ ] Replace client-only marketplace fixtures with API data and an honest loading/error state.
- [ ] Add a Coming soon badge/state and keep install/update disabled with a precise licensing/runtime prerequisite message.
- [ ] Add admin list/create/edit/publish controls and surface server-confirmed status and price.

### Task 3: Event-code administration and redemption

- [ ] Add admin event-code creation with code, title, expiry, claim limit, RBC cents, XP, points, mining-power reward, and badge/progress metadata.
- [ ] Add admin list/deactivate methods and audit fields.
- [ ] Ensure redemption checks active status, expiry, claim count, verified account, duplicate user claim, and idempotency before atomically recording reward activity and claim.
- [ ] Remove unnecessary session copy from the user event-code screen; retain meaningful security rules and server-confirmed reward preview.
- [ ] Add API tests for admin authorization, reward creation, successful redemption, duplicate/expired/invalid claims, max claims, and idempotent replay.

### Task 4: Verification

- [ ] Run marketplace and event-code test files.
- [ ] Run existing mining tests, frontend build, and `git diff --check`.
