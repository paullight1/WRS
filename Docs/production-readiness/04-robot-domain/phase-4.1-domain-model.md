# Phase 4.1 — Robot Domain Model

## Goal
Create authoritative persisted entities for robot ownership, capabilities and lifecycle.

## Implementation
- Define robots, robot profiles, configurations, package entitlements, capabilities, skills, levels, XP events, certifications and history.
- Make ownership and entitlement relationships explicit with foreign keys and lifecycle states.
- Separate durable robot identity from mutable visual/personality configuration.
- Model capability unlocks from entitlements rather than hard-coded UI tier checks.
- Add migrations, fixtures and domain invariants.

## Tests / Evidence
- Ownership uniqueness and entitlement constraints reject invalid state.
- Deleted/suspended users cannot retain active unauthorized robot access.
- Domain fixtures reproduce Starter through Visionary capability boundaries.

## Exit gate
All core robot screens can be backed by one authoritative domain model rather than `mock.js` globals.