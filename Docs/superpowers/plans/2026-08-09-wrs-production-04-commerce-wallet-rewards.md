# WRS Production Track 4: Commerce, Wallet, Mining, and Rewards

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Ten agents must work in isolated branches; financial changes require independent review before merge.

**Goal:** Build a financially safe commerce and rewards system covering package purchase, entitlements, wallet ledger, deposits, withdrawals, mining, boosts, event codes, and reward settlement.

**Architecture:** Treat money and reward points as separate ledgers. Payment providers create intents and signed events; they do not directly mutate client state. A double-entry or equivalently invariant-preserving ledger is the financial source of truth. Mining and rewards produce auditable program events and cannot be confused with cash balances.

**Tech Stack:** React 18/Vite, Node.js API, PostgreSQL, payment provider SDK/webhooks, double-entry ledger, reconciliation jobs, fraud/risk controls, queue/outbox, managed secrets.

## Global Constraints

- No client callback can mark a payment successful or activate a package.
- Confirmed, pending, held, reversed, and failed money states must remain distinct.
- Every financial mutation is idempotent, transactional, auditable, and reconciled.
- XP/RBC/reward points are not cash unless an approved settlement policy explicitly says so.
- Withdrawals require KYC/eligibility, limits, fraud checks, provider confirmation, and reconciliation.
- Historical ledger entries are immutable; corrections use compensating entries.

## Current Baseline

- Ledger reads: `server/ledger.js`, wallet routes in `server/app.js`
- Mining rules: `server/mining.js`
- Commerce UI: `src/screens/Packages.jsx`, `PackageDetail.jsx`, `Checkout.jsx`, `PaymentSuccess.jsx`
- Wallet UI: `Wallet.jsx`, `Transactions.jsx`, `DataRevenue.jsx`
- Rewards UI: `Mining.jsx`, `Boosts.jsx`, `EventCode.jsx`, `Rewards.jsx`
- Current behavior: server reads and development reward rules exist; payment, deposits, withdrawals, and settlement providers are unavailable.

## Parallel Execution Model

Agents 1–10 work in isolated branches. Agent 3 owns the canonical ledger schema and invariants. Agent 1 must publish payment event contracts before Agent 3 integrates them. Agent 5 owns reconciliation. Agents 6–7 may implement program rewards in parallel but cannot write cash ledger entries directly. Agent 10 performs independent financial integrity review.

## Agent Workstreams

### Agent 1 — Payment intent and provider adapter

**Own:** `server/payments/`, provider adapter, checkout routes, provider contract tests.

**Deliver:** payment intent creation; price/package snapshot; customer identity binding; provider request id; idempotency; timeout/retry policy; test/sandbox/live configuration separation.

**Required tests:** client cannot set amount/currency/package entitlement; duplicate intent returns the same intent; provider timeout is retryable; live credentials are rejected in test mode; mismatched customer is blocked.

**Acceptance:** Checkout creates an auditable provider intent but does not activate access until a verified webhook event is processed.

### Agent 2 — Signed webhooks and event ingestion

**Own:** `server/payments/webhooks/`, signature verification, replay protection, event inbox, webhook tests.

**Deliver:** raw event receipt; signature/timestamp validation; provider event deduplication; ordered processing; dead-letter handling; webhook audit.

**Required tests:** forged signature fails; replay is ignored; duplicate event is idempotent; unknown event is stored safely; processing failure retries without duplicate ledger entries.

**Acceptance:** Payment status changes only from a verified provider event or an explicitly audited operator action.

### Agent 3 — Financial ledger and invariants

**Own:** `server/ledger/`, migrations, account model, journal entries, balance projections, financial tests.

**Deliver:** immutable journal; debit/credit balancing; account types; confirmed/pending/held status; currency precision; idempotency keys; balance projection and rebuild command.

**Required tests:** every journal balances; concurrent writes do not lose money; negative balance rules are enforced; rebuild matches projection; reversal preserves history; currency rounding is deterministic.

**Acceptance:** No screen calculates authoritative money by summing arbitrary client values; all displayed balances derive from the ledger projection.

### Agent 4 — Package entitlement activation

**Own:** commerce-to-entitlement service, package migrations, package routes, `Packages.jsx`, `PackageDetail.jsx`, `PaymentSuccess.jsx`.

**Deliver:** package purchase record; entitlement activation after settled payment; renewal/expiry; refunds/revocation; price snapshot; package versioning.

**Required tests:** pending payment grants no access; successful webhook activates once; refund revokes according to policy; historical price remains unchanged; client cannot navigate to success to activate access.

**Acceptance:** Package access and tier checks are derived from server entitlement records, not static mock package data.

### Agent 5 — Reconciliation, refunds, and chargebacks

**Own:** reconciliation jobs, provider settlement reports, refund/chargeback state, finance runbook.

**Deliver:** daily provider-to-ledger reconciliation; mismatch queue; refund workflow; chargeback hold; manual review; alerts; correction entries.

**Required tests:** missing provider event is detected; duplicate settlement is safe; refund creates a compensating entry; chargeback blocks payout; mismatch cannot be silently discarded.

**Acceptance:** Finance can prove provider totals, ledger totals, outstanding mismatches, and resolution owner for every period.

### Agent 6 — Mining, missions, boosts, and program events

**Own:** `server/mining.js`, mining migrations, mining routes, `Mining.jsx`, `Boosts.jsx`, `EventCode.jsx`.

**Deliver:** server-created contribution events; mission rules; boost activation; event-code issuance/redemption; expiry; per-user limits; anti-abuse signals; points ledger separated from cash.

**Required tests:** arbitrary client increment fails; event code is single-use; cross-operation idempotency reuse fails; expired boost does not apply; reward caps hold under concurrency.

**Acceptance:** Mining progress is evidence-backed and auditable; UI cannot fabricate contribution progress, balances, or payouts.

### Agent 7 — Rewards, badges, and eligibility

**Own:** reward policy service, badge records, reward catalogue, `Rewards.jsx`.

**Deliver:** versioned reward rules; eligibility evidence; award/reversal events; badge criteria; abuse/fraud holds; programme end date; user history endpoint.

**Required tests:** ineligible user cannot claim; duplicate claim is safe; rule changes preserve historical awards; fraud hold prevents settlement; reversal is visible.

**Acceptance:** Rewards show source event, rule version, status, and whether value is points, credit, pending money, or settled money.

### Agent 8 — Deposits, withdrawals, and payout operations

**Own:** wallet mutation routes, payout provider adapter, KYC/limits integration, `Wallet.jsx`.

**Deliver:** withdrawal request state machine; beneficiary verification; limits; fees; holds; provider submission; callback; failure/retry; cancellation; payout reconciliation.

**Required tests:** unverified user is blocked; limit cannot be bypassed by parallel requests; insufficient confirmed balance fails; provider failure leaves funds held safely; duplicate callback is idempotent.

**Acceptance:** No withdrawal or deposit UI reports money movement until provider confirmation is reconciled into the ledger.

### Agent 9 — Commerce/wallet frontend and customer communication

**Own:** `Checkout.jsx`, `PaymentSuccess.jsx`, `Wallet.jsx`, `Transactions.jsx`, `DataRevenue.jsx`, shared money formatting/state components.

**Deliver:** server-driven payment states; pending/confirmed/failed/refunded views; retry-safe buttons; receipt links; support escalation; accessibility; no static balances.

**Required tests:** refresh during payment preserves provider state; fake success URL does not activate package; ledger error hides balance; pending and confirmed values cannot be conflated.

**Acceptance:** Every financial message is traceable to a server response and uses precise state language.

### Agent 10 — Independent financial integrity and launch audit

**Own:** financial threat model, invariant tests, staging reconciliation, release sign-off, production documentation.

**Deliver:** end-to-end sandbox purchase → webhook → entitlement → ledger → withdrawal → reconciliation; fraud scenarios; refund/chargeback drill; month-end report.

**Required tests:** duplicate webhooks, concurrent checkout, replayed idempotency keys, ledger rebuild, provider outage, chargeback, withdrawal race, and secret rotation.

**Acceptance:** Independent reviewer confirms no path can create, destroy, or settle money without a balanced, audited, reconciled ledger event.

## Track Release Gate

- [ ] Payment provider sandbox and signed webhook flow pass.
- [ ] Package entitlements activate only after verified settlement.
- [ ] Ledger invariants, rebuild, reversals, and reconciliation pass.
- [ ] Deposits/withdrawals include KYC, limits, holds, provider callbacks, and audit.
- [ ] Mining and rewards remain separate from cash.
- [ ] Refunds, chargebacks, fraud holds, and support operations work.
- [ ] Frontend never claims success from navigation or local state.
- [ ] Independent financial integrity review is approved.
