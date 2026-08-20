# Phase 8.3 — Skill Installation and Updates

## Goal
Make install/update controls actually change robot capabilities safely.

## Implementation
- Model installations by robot, entitlement, item version and state.
- Validate entitlement, compatibility, storage/limits and dependencies before install/update.
- Apply capability/configuration changes transactionally with rollback on failure.
- Track installed version, update availability and uninstall/recovery policy.
- Surface real progress/failure instead of success notifications only.

## Tests / Evidence
- Incompatible/unowned item cannot install through direct API calls.
- Failed update leaves prior working version intact where possible.
- Installed capability is reflected consistently in robot/domain views.

## Exit gate
Installing/updating an item produces durable robot state and can be audited back to entitlement/version.