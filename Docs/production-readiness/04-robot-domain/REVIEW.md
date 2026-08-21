# Plan 4 Adversarial Review Decisions

This file records the production invariants added while implementing Plan 4. It is not a substitute for final CI or live backend verification.

## Ownership and lifecycle

- One authoritative robot record is allowed per WRS owner in this product model.
- Browser-supplied `userId`, package labels, robot IDs and UI visibility are never authorization.
- Every owned robot read/write is re-authorized against the authenticated user on the server.
- Unknown or unauthorized resource IDs fail closed; WRS never substitutes a default robot/deployment record.

## Package entitlements and capabilities

- Package selection during onboarding is a request, not a purchase or entitlement grant.
- Robot provisioning requires an active server-side entitlement for the exact selected package.
- Capability checks use a centralized package/capability model and are repeated server-side on initial provisioning and configuration updates.
- A client cannot unlock custom voice, advanced tuning, elite modules or visionary modules by changing UI state.

## Onboarding and configuration

- Onboarding completion is one atomic, idempotent operation covering entitlement validation, robot creation, initial configuration, onboarding completion, public passport projection and history event creation.
- Concurrent onboarding retries are serialized per user.
- Configuration writes use optimistic versioning. Stale writes return a conflict and the client reloads the confirmed server version.
- Client optimistic state rolls back when persistence fails or authorization/capability checks reject the write.

## Passport and export

- Production passport data is assembled only from server-owned robot, skill, certification, XP and history records.
- The public passport projection intentionally excludes owner PII, wallet/financial data and private operational metadata.
- Demo passports are explicitly non-authoritative and cannot export a verified PDF.
- Production PDF download requires a server-generated, time-bounded export descriptor; a frontend-generated HTML/JSON file is not accepted as a verified passport.

## XP progression

- XP is an append-only event ledger, not a mutable balance field.
- Every award has a unique idempotency key and verified source/reference.
- Corrections are compensating reversal events; original XP events are never edited or deleted.
- Double reversal and mismatched reversal amount are rejected.
- Level is derived deterministically from the accepted event projection.

## Database boundary

- Robot/history/XP browser writes are revoked; service-role-only functions own authoritative mutations.
- Robot history and XP tables have append-only mutation guards.
- RLS limits private robot data to the authenticated owner, while the public passport projection is deliberately privacy-safe.

## Remaining external activation evidence

A dedicated WRS Supabase project is still required before these migrations/functions can be applied and verified live. Live evidence must include RLS isolation, service-role function behavior, concurrent onboarding idempotency, optimistic conflicts, XP duplicate/reversal cases, persistent cross-device state and signed PDF export behavior.
