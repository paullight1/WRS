# Phase 3.5 — Password Recovery

## Goal
Implement a genuine secure forgot/reset-password lifecycle.

## Implementation
- Add forgot-password entry separate from login.
- Issue short-lived single-use reset tokens without account-enumeration leakage.
- Require a compliant new password and invalidate the reset token after success.
- Revoke or review existing sessions after a credential reset.
- Notify the account of password changes and record a security event.

## Tests / Evidence
- Unknown account requests return a non-enumerating response.
- Expired/reused/tampered reset tokens fail.
- Successful reset changes credential and invalidates old credential/session state as defined.

## Exit gate
Forgot Password no longer loops back to login and the complete recovery path is verified end to end.