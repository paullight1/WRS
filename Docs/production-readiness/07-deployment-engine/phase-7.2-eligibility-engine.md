# Phase 7.2 — Deployment Eligibility Engine

## Goal
Move package/skill/certification eligibility from UI badges into server-enforced policy.

## Implementation
- Evaluate package entitlement, required skills/certifications, robot health/status, data quality/reputation and applicable compliance rules.
- Return structured allow/deny reasons that the UI can explain.
- Version eligibility rules so historical decisions remain explainable.
- Prevent client-supplied tier/capability claims from influencing authority.
- Define manual-review override only through privileged audited operations.

## Tests / Evidence
- Direct API request to a locked sector is rejected.
- Boundary tiers/certifications produce expected eligibility.
- Changing a rule version does not corrupt historical decisions.

## Exit gate
The server—not the React lock icon—decides whether a robot may request or activate a deployment.