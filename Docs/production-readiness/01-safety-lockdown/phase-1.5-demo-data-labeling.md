# Phase 1.5 — Demo Data Labeling and Stale Content Cleanup

## Goal
Ensure illustrative balances, earnings, deployment records, dates and performance figures cannot be mistaken for live user data.

## Implementation
- Inventory all values sourced from `src/data/mock.js` and other hard-coded operational records.
- Add consistent demo/illustrative labeling where mock data remains visible.
- Remove or update stale 2025 deadlines, deployment dates, transaction periods and referral histories from active-looking flows.
- Prevent demo financial figures from appearing in production authenticated surfaces.
- Document the replacement data source expected for each mock dataset.

## Tests / Evidence
- Search for stale dates and hard-coded money/identity claims.
- Visual/E2E checks confirm demo labels are prominent and accessible.
- Production-mode tests confirm sensitive mock records are hidden or replaced.

## Exit gate
No reasonable user can confuse remaining prototype data with a live balance, payment, contract, deadline, payout or identity record.