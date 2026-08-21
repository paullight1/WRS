# Phase 4.4 — Authoritative Robot Passport

## Goal
Generate the Robot Passport from verified domain records rather than static identity/history arrays.

## Implementation
- Source robot ID, owner, activation, class, level, skills, certifications and deployment history from authoritative services.
- Add a stable public/non-secret verification identifier for passport authenticity.
- Define which passport fields are private, owner-only or safe to share publicly.
- Remove fabricated certifications/history until earned records exist.
- Audit changes to identity-critical passport fields.

## Tests / Evidence
- Passport cannot show another user's private record.
- Revoked/expired certifications display correct state.
- History derives from actual deployment records only.

## Exit gate
Every passport claim is traceable to a persisted authoritative record and appropriate authorization policy.