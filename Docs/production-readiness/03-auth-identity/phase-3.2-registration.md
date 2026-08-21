# Phase 3.2 — Real Registration

## Goal
Turn the current registration UI into a validated, rate-limited account-creation workflow.

## Implementation
- Validate required name, normalized email, international phone and password confirmation/strength.
- Check uniqueness without leaking whether an account exists more than necessary.
- Record Terms and Privacy acceptance with version and timestamp.
- Create a pending account and verification challenge atomically.
- Handle referral input as untrusted data; defer reward qualification to the referral engine.
- Add request throttling and abuse logging.

## Tests / Evidence
- Empty/invalid fields, duplicate identifiers, weak/mismatched passwords and missing consent fail safely.
- Successful registration creates exactly one pending account.
- Repeated requests cannot create duplicate accounts.

## Exit gate
A user cannot reach verified application state without a valid persisted registration record.