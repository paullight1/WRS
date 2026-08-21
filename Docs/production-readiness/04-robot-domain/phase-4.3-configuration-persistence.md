# Phase 4.3 — Robot Configuration Persistence

## Goal
Turn Customize Robot into a real persisted configuration workflow.

## Implementation
- Persist parts, palette, personality, tuning and voice-profile references.
- Validate each selection against ownership/unlock entitlements server-side.
- Use optimistic UI only with rollback on failed save.
- Add versioning or updated-at conflict handling so two devices cannot silently overwrite newer configuration.
- Replace the current success toast with service-backed save state.

## Tests / Evidence
- Saved configuration survives reload/new device.
- Locked parts cannot be selected through direct API manipulation.
- Failed save rolls the UI back or clearly reports unsaved changes.

## Exit gate
`Save Robot` means the authoritative robot configuration changed, and the same configuration renders everywhere WRS shows the robot.