# Phase 6.1 — Consent Architecture

## Goal
Create auditable consent records before WRS stores or processes voice, facial, movement, language or other contributed data.

## Implementation
- Define consents, consent versions, purposes, consent events and retention policies.
- Record subject, data category, purpose, policy version, timestamp, jurisdiction/context and withdrawal state.
- Separate consent for personal-robot use, dataset contribution, research/licensing and optional marketing where applicable.
- Make consent checks server-enforced before upload/processing/licensing.
- Preserve immutable evidence of grant/withdrawal while respecting deletion obligations.

## Tests / Evidence
- Missing/withdrawn consent blocks relevant processing.
- Policy-version changes can require re-consent without rewriting old evidence.
- One purpose cannot silently authorize another.

## Exit gate
WRS can answer who consented to what data use, under which policy, when, and whether that consent remains valid.