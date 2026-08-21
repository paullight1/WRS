# Phase 8.4 — Event Code Service

## Goal
Replace client-accepted arbitrary codes with server-generated, expiring, single-use event claims.

## Implementation
- Generate high-entropy/signed event codes or tokens server-side with event ID, expiry and reward policy.
- Validate redemption against authenticated account, event window, verification requirements and prior claims.
- Enforce one-claim rules and rate-limit invalid attempts.
- Record redemption as an immutable event before awarding rewards.
- Support code revocation and operational visibility for abuse.

## Tests / Evidence
- Random filled code, expired code, altered code and duplicate claim fail.
- Reloading the page does not reset server expiry.
- Concurrent duplicate redemption yields one accepted claim.

## Exit gate
Only an active server-issued code for an eligible event/account can generate a redemption record.