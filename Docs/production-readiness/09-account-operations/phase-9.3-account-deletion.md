# Phase 9.3 — Account Deletion Lifecycle

## Goal
Make `Delete account` a secure, auditable lifecycle that respects privacy, financial and legal retention requirements.

## Implementation
- Require recent authentication/2FA for deletion initiation.
- Define immediate access revocation, optional cooling/recovery period and irreversible completion point.
- Revoke sessions/tokens and stop new processing/deployments/rewards.
- Delete or anonymize eligible personal/data records while retaining only documented legally necessary financial/security evidence.
- Coordinate robot ownership, contributions, marketplace entitlements and open financial/deployment obligations.

## Tests / Evidence
- Unauthorized/CSRF-like initiation fails.
- Deleted account cannot continue using prior sessions.
- Deletion jobs are retryable and failures are visible.

## Exit gate
Account deletion has a documented end-to-end state machine and demonstrably removes/anonymizes eligible data without corrupting required records.