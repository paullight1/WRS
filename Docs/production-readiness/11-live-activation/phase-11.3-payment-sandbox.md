# Phase 11.3 — Payment and payout sandbox verification

## Goal
Prove the Plan 5 ledger against a real provider sandbox rather than repository doubles.

## Required scenarios
Checkout initialization; signed webhook verification; duplicate webhook; delayed webhook; failed payment; successful entitlement; refund/chargeback compensation; payout destination verification; KYC-gated withdrawal; provider rejection; reversal; reconciliation with zero unexplained variance.

## Exit gate
Provider IDs, timestamps, reconciliation totals and test run references are recorded without secrets or customer data.