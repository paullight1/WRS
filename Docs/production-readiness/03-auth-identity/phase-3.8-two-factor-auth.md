# Phase 3.8 — Two-Factor Authentication

## Goal
Make the existing 2FA setting a real account-security control, especially for financial actions.

## Implementation
- Implement TOTP or approved OTP-based 2FA with enrollment verification.
- Generate securely stored/redeemable recovery codes.
- Require recent reauthentication/2FA for high-risk actions such as withdrawals, identity changes and security settings.
- Add disable/reset flows with stronger verification and audit logs.
- Define administrator support procedure for lost-factor recovery.

## Tests / Evidence
- Enrollment cannot activate until a valid factor is proven.
- Reused/expired invalid factors fail and are rate-limited.
- High-risk endpoints enforce 2FA even if the frontend is bypassed.

## Exit gate
The Settings 2FA state reflects real server-enforced protection and sensitive operations require the configured factor.