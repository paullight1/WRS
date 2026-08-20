# Phase 4.5 — Passport PDF Export

## Goal
Make `Download Passport (PDF)` generate a genuine, verifiable document.

## Implementation
- Generate PDF server-side or through a trusted deterministic document service from passport data.
- Include robot ID, issue timestamp, verification reference/QR or URL, and clearly scoped public fields.
- Avoid exposing hidden personal/financial information in the export.
- Add filename/content-disposition and accessible document metadata.
- Define regeneration/version behavior after passport changes.

## Tests / Evidence
- Generated PDF opens correctly and matches authoritative passport state.
- Unauthorized users cannot export another owner's private passport.
- Verification reference resolves to correct current validity.

## Exit gate
The download control returns a real PDF whose important claims can be independently verified against WRS.