# Phase 5.6 — Withdrawals

## Goal
Implement a safe end-to-end payout workflow instead of a success notification.

## Implementation
- Require authenticated, verified/KYC-eligible user and recent 2FA/reauthentication.
- Validate available balance, limits, destination and currency server-side.
- Reserve/lock funds atomically before provider payout.
- Track requested, reviewing, processing, paid, failed and reversed states.
- Release or compensate funds safely on failure.
- Add fraud/risk hooks and manual-review capability.

## Tests / Evidence
- Insufficient balance, duplicate request and concurrent-withdrawal races fail safely.
- Provider timeout/retry cannot pay twice.
- Failed payout returns funds through ledger entries.

## Exit gate
A withdrawal always maps to an auditable state machine, ledger reservation and verified payout result.