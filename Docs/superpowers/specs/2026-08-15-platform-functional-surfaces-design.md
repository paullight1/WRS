# WRS Functional Surfaces Design

Date: 2026-08-15

## Goal

Turn the twelve annotated product surfaces into server-backed, honest user journeys. The implementation must preserve the existing rule that financial, support, referral, marketplace, and reward states are never implied unless the server has recorded them.

## Scope

### Identity and onboarding

The onboarding robot name defaults to `wrs-[user-name]`, using a normalized display name and later preferring a username when one exists. The server owns uniqueness: collisions receive a deterministic suffix rather than overwriting another robot's name. The client remains editable, but all saved names pass through the same normalization and uniqueness path.

Package discovery is positioned as a catalogue and comparison surface, not a duplicate onboarding step. Mining access is determined only by a server-confirmed active entitlement or subscription; selecting a package during onboarding does not create paid access.

### RBC mining and wallet

Leaderboard tabs request the selected server category and normalize the response fields into rank, member, robot, metric, unit, and current-user state. Each category has an explicit metric label. Empty categories remain valid states rather than errors.

Wallet conversion copy explains that launch rates are published by WRS at launch. The destination currency selector is available from a configured allowlist even before a rate is published; quote creation still requires a server-published rate.

The withdrawal request becomes a four-step dialog: amount, destination currency and quote, bank details, and review/confirmation. The quote is created only after amount and currency are selected. Bank details stay local until final submission, and the server remains the authority for quote expiry, balance availability, duplicate pending requests, and idempotency.

The wallet summary explains:

- Available RBC: verified RBC eligible for a quote or withdrawal.
- Pending RBC: submitted earnings awaiting verification and therefore not spendable.
- Locked RBC: available RBC reserved by an open withdrawal and temporarily unavailable.

### Support

Support topics and common questions become an authored, searchable help catalogue with article detail views. Ticket submission validates subject, category, and message, then persists an authenticated ticket with status, timestamps, and an append-only reply history. Users can view their own ticket list and detail. Live chat remains an explicit provider-dependent state until a chat service is connected.

### Referrals

The referral surface becomes a server-owned programme view. It exposes a stable authenticated referral code/link, attribution events, qualification status, review windows, and a reconciled reward ledger. Registration referral codes create attribution records. Self-referrals, duplicate attribution, repeated reward claims, and obvious duplicate-account signals are rejected or held for review. Rewards remain pending until qualification and review are complete.

### Marketplace and admin

Marketplace items move to server-owned catalogue records with name, description, category, developer, price, currency, version, compatibility tier, icon/image metadata, status, and publication timestamps. The user surface reads those records and supports filtering, search, and installed-state presentation. Packs may be marked `coming_soon`, which is shown directly in the catalogue.

Trusted administrators receive a marketplace control surface to create, edit, publish, unpublish, price, categorize, and mark packs coming soon. The initial artifact field is a validated package URL/metadata reference so catalogue publication is complete without pretending that binary storage or robot-runtime installation exists. Install/update actions remain disabled with an explicit prerequisite until licensing, artifact storage, and runtime installation are connected.

### Event codes

Event codes are created and managed by trusted administrators. An admin can generate a code with reward amounts for RBC, XP, points, mining power, an optional badge/progress label, an expiry window, a maximum claim count, and an optional event title. Codes are displayed to users only through the authenticated redemption screen.

Redemption is server-owned and idempotent. A code must be active, unexpired, within its claim limit, and unused by the account. Invalid-attempt counters and temporary lockout are retained. A successful redemption writes the reward ledger and participation record atomically. The UI removes unnecessary session-related copy and keeps only meaningful security rules: one claim per verified account, expiry, duplicate-claim blocking, invalid-attempt monitoring, and admin-generated codes.

## Implementation boundaries

Three independent implementation tracks will run in parallel:

1. Support: help catalogue, ticket API, user UI, and tests.
2. Referrals: referral API, registration attribution, user UI, abuse/qualification rules, and tests.
3. Marketplace and event-code administration: catalogue API/admin UI, event-code admin API/admin UI, user marketplace/redeem integration, and tests.

Shared work remains in the main integration path: onboarding identity, package entitlement messaging, mining leaderboard normalization, wallet wizard/currencies/explanations, shared API conventions, route registration, and final verification.

## Error and security behavior

All mutations use authenticated ownership checks, role checks for administration, input validation, and idempotency keys where a retry can create state. Sensitive bank details remain masked in responses. Support and referral data are scoped to the authenticated user. Admin catalogue and event-code changes are audited. A missing third-party provider produces an explicit unavailable state and never a simulated success.

## Verification

The combined change must pass focused unit/API tests for each new mutation, existing regression suites, build/type checks, `git diff --check`, and high-severity production dependency audit. Manual verification covers all twelve annotated routes, including an active event-code redemption, a duplicate redemption rejection, a published marketplace item, a coming-soon item, and the four-step withdrawal flow with no published conversion rate.
