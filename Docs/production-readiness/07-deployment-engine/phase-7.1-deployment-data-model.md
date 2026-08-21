# Phase 7.1 — Deployment Data Model

## Goal
Create authoritative records for deployment opportunities, contracts, active work and history.

## Implementation
- Define industries, clients, deployment opportunities, requests, contracts, deployments, events, performance records and settlements.
- Separate advertised opportunity terms from accepted contract terms.
- Add ownership/client/robot references, lifecycle timestamps and immutable commercial references.
- Model location/virtual-work context without exposing unnecessary user location data.
- Migrate current industry/worksite metadata into seed/catalogue data only where appropriate.

## Tests / Evidence
- Invalid client/robot/opportunity relationships fail constraints.
- Closed/cancelled opportunities cannot accept new requests.
- Historical contract terms remain stable when catalogue data changes.

## Exit gate
Every deployment screen can be mapped to authoritative opportunity/contract/deployment records rather than static arrays.