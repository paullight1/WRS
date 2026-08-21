# Phase 7.5 — Active Deployment State Machine

## Goal
Make active, paused, completed, cancelled and failed deployment states authoritative and enforceable.

## Implementation
- Define allowed transitions such as scheduled → active → paused/resumed → completed, plus cancelled/failed paths.
- Require authorized actors and reason/evidence where transitions are sensitive.
- Make Pause Deployment and reassignment controls call real operations.
- Record every transition as a deployment event.
- Remove current unknown-ID fallback to a valid-looking default deployment.

## Tests / Evidence
- Invalid transitions fail deterministically.
- Unknown deployment ID returns not-found rather than another deployment.
- Concurrent pause/complete actions resolve safely.

## Exit gate
The active deployment page reflects server state and every state change is authorized, validated and audited.