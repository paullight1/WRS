# Phase 6.8 — User Data Export

## Goal
Make `Download my data` produce a real secure export of the user's eligible personal data.

## Implementation
- Define export scope across profile, robot, consent, contributions, rewards/history and other applicable records.
- Require authenticated/recently verified request for sensitive exports.
- Generate asynchronously where needed and store encrypted/short-lived downloadable archives.
- Use documented structured formats plus media references/files where appropriate.
- Expire download links and audit request/generation/download events.

## Tests / Evidence
- User can export only their own data.
- Export reflects authoritative records and documented exclusions.
- Expired links cannot be reused.

## Exit gate
A user can request and receive a secure, complete, documented export without exposing another user's information.