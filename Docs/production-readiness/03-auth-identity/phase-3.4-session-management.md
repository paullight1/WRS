# Phase 3.4 — Login and Session Management

## Goal
Create secure authenticated sessions instead of navigating to `/home` unconditionally.

## Implementation
- Verify password credentials server-side using a modern password hash.
- Issue secure HTTP-only same-site cookies or an equivalent protected session mechanism.
- Implement session rotation, expiry, remember-me policy, logout and server-side revocation.
- Track device/session metadata for account security without exposing unnecessary fingerprinting.
- Add login throttling and suspicious-login security events.

## Tests / Evidence
- Wrong credentials never establish a session.
- Logout invalidates the session server-side.
- Expired/revoked cookies cannot access protected APIs.
- Session fixation and replay scenarios are tested.

## Exit gate
Authenticated state is derived from a valid revocable server session, not React navigation or local state.