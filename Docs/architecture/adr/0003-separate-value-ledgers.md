# ADR 0003: Separate non-cash rewards, pending money, and confirmed money

## Status

Accepted

## Context

WRS displays XP, points, boosts, credits, contribution rewards, referral rewards,
deployment revenue, and possible dataset distributions. Combining them in a single
balance would mislead users, complicate reconciliation, and allow non-financial activity
to behave like money accidentally.

## Decision

Maintain distinct value accounts and ledger rules for XP, points, platform credits, and
each monetary currency. Estimated amounts are projections outside the ledger. Monetary
entries transition from pending to confirmed only through an authorized, reconciled
program event. All postings reference an idempotent source event and rule version;
corrections use reversal/replacement entries.

Package entitlements, role authority, and reputation are not balances and cannot be
posted or exchanged through these ledgers.

## Consequences

- Wallet and Rewards are separate views over explicit value types, with no ambiguous
  `total value`.
- Each program must define funding, qualification, currency, settlement, reversal, tax,
  and withdrawal behavior before it can post money.
- Finance reconciliation and reporting are simpler and auditable, but the application
  must support multiple account types and transaction histories.
- Future conversion programs require a new reviewed rule and ledger transfer model; no
  implicit XP-to-cash exchange exists.

