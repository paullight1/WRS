# Phase 6.5 — Training/Data Submission Lifecycle

## Goal
Replace success toasts with a real lifecycle for contributed training and annotation work.

## Implementation
- Model `draft → submitted → processing → review → approved/rejected → deleted` with allowed transitions.
- Link submissions to task, robot/user, source objects, consent and review evidence.
- Make submit idempotent and lock immutable submitted payload/version as required.
- Surface processing/review/rejection reasons without leaking internal moderation/security details.
- Emit domain events for approved contributions rather than directly adding XP in the client.

## Tests / Evidence
- Invalid state transitions fail.
- Duplicate submit creates one submission.
- Reviewer decision requires authorized role and audit trail.
- Deleted/withdrawn records stop future eligible processing.

## Exit gate
Every training/data item shown as submitted, approved or rejected has an authoritative server-side state and history.