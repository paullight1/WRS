# Phase 9.4 — Support Ticketing

## Goal
Replace fake ticket references/live-chat controls with a genuine support case workflow.

## Implementation
- Define support tickets, messages, attachments, category, priority, status and assigned operator/team.
- Validate subject/message input and safely handle attachments through secure upload infrastructure.
- Generate real unique case references and confirmation notifications.
- Support customer replies and staff status transitions with audit history.
- Add abuse/rate controls and protect sensitive account/financial support data.

## Tests / Evidence
- Submission creates one persisted case/reference.
- Empty/oversized/unauthorized attachment requests fail.
- User sees only their own cases unless staff role permits broader access.

## Exit gate
`Submit ticket` creates a real trackable support case and every visible support reference corresponds to stored operational state.