# Phase 1.1 — Dangerous Prototype Actions Inventory

## Goal
Create a definitive inventory of every WRS control that appears to perform a sensitive action without an authoritative backend operation.

## Implementation
- Trace checkout, payment-success, deposit, withdrawal, event-code, rewards, boosts, data revenue, training capture/upload, deployment requests, marketplace purchases, account/data deletion and support submission.
- Record route/component, current behavior, expected production behavior, data touched, monetary/privacy risk, and required backend dependency.
- Classify each item P0/P1/P2 and assign one temporary disposition: disable, demo-label, or preserve as safe read-only UI.
- Add a machine-readable or Markdown checklist used by subsequent phases.

## Tests / Evidence
- Source search proves every sensitive button/route is classified.
- Review all direct URL entry points for bypasses.
- Confirm no unclassified control can create a financial, identity, privacy or entitlement claim.

## Exit gate
100% of sensitive prototype actions are inventoried with owner, risk and temporary disposition. No known P0 action remains undocumented.