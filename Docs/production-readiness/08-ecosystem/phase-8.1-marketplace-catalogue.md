# Phase 8.1 — Marketplace Catalogue

## Goal
Replace static marketplace arrays with an authoritative catalogue of skills, packs and modules.

## Implementation
- Define marketplace items, publishers, categories, versions, compatibility requirements, prices, availability and moderation state.
- Separate catalogue metadata from user entitlements/installations.
- Version downloadable/configurable artifacts and publisher release notes.
- Enforce package/robot compatibility server-side.
- Add publication/moderation workflow for first-party and future third-party items.

## Tests / Evidence
- Unpublished/disabled items cannot be purchased or installed.
- Compatibility checks reject direct API bypasses.
- Version history remains stable after updates.

## Exit gate
Marketplace browse/search/detail responses come from an authoritative catalogue with explicit lifecycle and compatibility rules.