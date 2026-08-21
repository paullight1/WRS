# Phase 6.4 — Secure Upload Infrastructure

## Goal
Safely accept audio, video, images, documents and datasets without exposing storage or backend services.

## Implementation
- Use short-lived signed upload URLs or an equivalent brokered upload mechanism.
- Enforce MIME/type, extension, size and per-user quota checks server-side.
- Store objects privately with encryption and unpredictable keys.
- Add malware/content scanning where relevant before downstream processing.
- Track upload intent, checksum, storage object, owner, consent and processing state.
- Clean abandoned/incomplete uploads through retention jobs.

## Tests / Evidence
- Oversized, spoofed MIME, unauthorized and expired upload attempts fail.
- User A cannot fetch User B private object by guessing a key.
- Interrupted multipart/resumable uploads recover or clean up safely.

## Exit gate
All user-uploaded data enters private storage through authenticated, validated, auditable upload paths.