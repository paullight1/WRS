# Phase 6.3 — Facial and Movement Capture

## Goal
Implement genuine camera-based capture with stricter privacy controls for biometric/sensitive media.

## Implementation
- Present purpose/retention/usage information before requesting camera access.
- Capture supported video/image segments with preview and explicit submit/delete controls.
- Require data-category-specific consent; optional research/licensing consent must remain separate.
- Strip unnecessary metadata where appropriate and record capture/submission provenance.
- Define whether biometric templates are created; prohibit implicit biometric identification unless explicitly designed/legal.

## Tests / Evidence
- Permission denial, no camera, interrupted stream and mobile rotation cases.
- Withdrawal of contribution consent blocks submission.
- No hidden background capture after the user stops/leaves the screen.

## Exit gate
WRS collects facial/movement media only through an explicit, visible, consent-backed capture lifecycle with auditable purpose.