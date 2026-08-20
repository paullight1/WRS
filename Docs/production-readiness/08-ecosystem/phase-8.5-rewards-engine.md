# Phase 8.5 — Rewards Engine

## Goal
Create a single authoritative service for XP, points, badges and participation rewards.

## Implementation
- Define reward rules with version, qualifying event type, amount/benefit, limits and active period.
- Consume verified domain events such as approved contribution, completed course, valid event attendance or qualified referral.
- Create append-only reward grants with unique source references.
- Separate XP, spendable points, badges and promotional credits as distinct value types.
- Add reversal/expiry mechanics through explicit events where applicable.

## Tests / Evidence
- Client cannot directly award itself points/XP.
- Duplicate source event yields one reward grant.
- Rule changes preserve historical grant explanation.

## Exit gate
Every displayed reward is traceable to a verified qualifying event and versioned reward rule.