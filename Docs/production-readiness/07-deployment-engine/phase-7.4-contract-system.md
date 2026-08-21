# Phase 7.4 — Contract System

## Goal
Provide real contract terms and acceptance evidence instead of a `Contract opened` toast.

## Implementation
- Persist client, robot/owner, role, start/end, hours, rate, deductions/fees, obligations, safety rules and termination terms.
- Render contract content from the accepted immutable/versioned contract record.
- Record acceptance, timestamp, actor and contract version/signature evidence as appropriate.
- Prevent deployment activation before required acceptance/compliance steps.
- Support cancellation/termination amendments through explicit state/events rather than edits to historical terms.

## Tests / Evidence
- Contract shown matches the terms attached to the deployment.
- Unauthorized actor cannot accept another owner's contract.
- Changed catalogue rates do not rewrite accepted contracts.

## Exit gate
`View Contract` opens a real persisted agreement and activation is tied to documented acceptance state.