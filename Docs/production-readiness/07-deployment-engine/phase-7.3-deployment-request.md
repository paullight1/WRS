# Phase 7.3 — Deployment Request and Matching

## Goal
Turn `Request/Confirm Deployment` into a genuine auditable request workflow.

## Implementation
- Create request from an eligible opportunity and robot with idempotency protection.
- Snapshot relevant eligibility and advertised terms at request time.
- Model requested, reviewing/matching, accepted and rejected/expired states.
- Return human-readable rejection/next-step state to the owner.
- Emit events/notifications from real state changes.

## Tests / Evidence
- Ineligible/closed opportunity requests fail.
- Duplicate clicks create one request.
- User cannot request deployment for another user's robot.
- Accepted request points to a real contract.

## Exit gate
A deployment request creates an authoritative record and advances only through defined server-side transitions.