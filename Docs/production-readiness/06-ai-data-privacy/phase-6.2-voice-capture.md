# Phase 6.2 — Voice Capture

## Goal
Replace the fake recording timer/waveform with a real, consented voice-recording workflow.

## Implementation
- Request microphone permission only after explaining purpose and consent requirements.
- Capture audio through supported browser media APIs with clear start/stop state.
- Allow playback, delete/re-record and language/task metadata before submission.
- Validate duration/format/size client-side for UX and server-side for trust.
- Upload only after active consent and create a submission record linked to the consent evidence.
- Handle permission denial, device loss and interrupted recording gracefully.

## Tests / Evidence
- Permission denied/no microphone paths.
- Start/stop/play/delete/re-record behavior in browser E2E.
- Submission without consent is rejected server-side.

## Exit gate
A submitted voice sample corresponds to real captured media, an authenticated user, a defined purpose and valid consent.