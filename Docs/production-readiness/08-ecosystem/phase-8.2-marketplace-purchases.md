# Phase 8.2 — Marketplace Purchases and Entitlements

## Goal
Make `Get` and paid marketplace actions create real entitlements through the financial system.

## Implementation
- Create purchase/order records linked to catalogue version, price/currency and user/robot.
- Use the financial ledger/payment system for paid items; free items still create explicit entitlements.
- Enforce idempotency for repeated purchase clicks/webhooks.
- Handle refunds/revocations according to item policy.
- Distinguish ownership from installation state.

## Tests / Evidence
- Paid entitlement appears only after verified payment.
- Free entitlement cannot be duplicated.
- Unauthorized user cannot consume another user's purchase reference.

## Exit gate
Every owned marketplace item has a server-side entitlement traceable to a valid free acquisition or reconciled payment.