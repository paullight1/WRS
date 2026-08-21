# Phase 9.2 — Settings Persistence

## Goal
Replace local-only Settings toggles and empty rows with real persisted preferences and security controls.

## Implementation
- Persist language, currency, timezone, notification preferences, marketing consent and applicable robot preferences.
- Separate simple preferences from security/privacy controls that require dedicated services.
- Make update APIs partial, validated and authorization-protected.
- Define defaults and migration behavior for existing users.
- Sync frontend state from the server and clearly handle save failure.

## Tests / Evidence
- Preference changes survive refresh/new device.
- Unsupported values fail validation.
- Failed save does not falsely show a persisted change.

## Exit gate
Every interactive production setting either performs a real persisted operation or is intentionally disabled/removed.