# Phase 6.9 — Dataset Licensing and Contributor Allocation

## Goal
Create the backend foundation for the WRS dataset-economy vision without licensing unconsented or unverified data.

## Implementation
- Define datasets, dataset items, eligibility snapshots, licenses/customers, usage/settlement events and contributor allocations.
- Include only approved data with valid consent for the specific licensing purpose.
- Track provenance from licensed item back to source submission and consent state.
- Define removal/revocation handling when consent or eligibility changes.
- Calculate participant allocations from transparent versioned rules and settle through the financial ledger.

## Tests / Evidence
- Unconsented/rejected/deleted data cannot join a licensable dataset.
- Dataset manifest is reproducible from an eligibility snapshot.
- Allocation totals reconcile to the contributor pool/ledger transaction.

## Exit gate
Every licensed dataset item and contributor distribution is traceable to approved data, valid consent, a license event and reconciled financial records.