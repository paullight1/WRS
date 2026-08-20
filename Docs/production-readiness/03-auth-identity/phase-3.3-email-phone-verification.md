# Phase 3.3 — Email and Phone Verification

## Goal
Replace the empty-OTP bypass with real single-use verification challenges.

## Implementation
- Issue email verification and phone OTP challenges server-side.
- Store hashed/opaque challenge state with expiry, attempt count and consumed status.
- Implement resend cooldowns, attempt limits and rate limits by account/device/IP signal.
- Make verification idempotent and audit successful/failed attempts.
- Support provider failure and recovery without corrupting account state.

## Tests / Evidence
- Empty, malformed, wrong, expired, already-used and brute-forced OTPs fail.
- Correct OTP verifies only the intended user once.
- Resend invalidates or supersedes prior challenges according to documented policy.

## Exit gate
No client-side value or URL can mark email/phone verified; only a valid server challenge can.