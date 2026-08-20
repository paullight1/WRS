# Phase 10.3 — Browser and Web Security Headers

## Goal
Reduce browser-side exploitation and protect authenticated WRS sessions.

## Implementation
- Configure Content-Security-Policy appropriate to Vite assets, Three.js and approved third parties.
- Enable HSTS in production after HTTPS/domain validation.
- Set `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and frame-ancestor/clickjacking protection.
- Ensure auth/session cookies are Secure, HTTP-only and appropriately SameSite.
- Audit dangerous HTML injection, external links, iframe usage and third-party scripts.
- Restrict microphone/camera permissions to pages/origins that genuinely need them.

## Tests / Evidence
- Automated header checks against staging/production-like deployment.
- CSP report/testing reveals no required resources unexpectedly blocked.
- Session cookie attributes are verified in browser E2E.

## Exit gate
Production responses enforce an reviewed security-header/cookie policy without breaking approved application functionality.