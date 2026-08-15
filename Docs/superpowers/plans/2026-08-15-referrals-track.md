# WRS Referrals Track Implementation Plan

> **For agentic workers:** Implement only referral data/API/UI. Keep shared route registration and registration-screen wiring isolated when possible; report exact route additions for the main agent.

**Goal:** Replace the referral locked state with an authenticated referral identity, attribution view, qualification state, and reconciled reward ledger.

**Architecture:** Add a server-owned referral module with stable codes, attribution events, qualification snapshots, abuse holds, and reward entries. The UI reads one aggregate referral view and never locally credits RBC.

**Tech Stack:** React, existing API client, Node HTTP API, JSON/Postgres store abstraction, Node test runner.

## Global Constraints

- Rewards remain pending until qualification and review are complete.
- Reject self-referrals and duplicate attribution; never issue duplicate reward entries.
- Referral data is scoped to the authenticated account.
- Registration code capture must not silently claim rewards.

## File Map

- Create: `server/referrals.js` — referral identity, attribution, qualification, and ledger.
- Create: `src/lib/referralsApi.js` — referral API client.
- Modify: `src/screens/Referrals.jsx` — referral dashboard and states.
- Modify: `src/screens/Register.jsx` only if needed for server attribution wiring.
- Test: `server/tests/referrals.test.js`.

### Task 1: Referral domain and tests

- [ ] Add `ensureReferralCollections(db)` for identities, attributions, rewards, and abuse signals.
- [ ] Implement deterministic code generation from user identity plus collision suffixing.
- [ ] Implement `getReferralSummary(db, userId)`, `attributeReferral(db, referredUserId, code, timestamp, idempotencyKey)`, and `qualifyReferral(db, actor, attributionId, input, timestamp, idempotencyKey)` for trusted review.
- [ ] Enforce self-referral rejection, one attribution per referred user, code ownership, and idempotent replay.
- [ ] Return counts and rows for clicks/attributions, pending/qualified status, review windows, and reward ledger entries.
- [ ] Add API tests for summary, valid attribution, invalid/self/duplicate attribution, and no duplicate rewards.

### Task 2: Referral UI and registration integration

- [ ] Replace the locked `Referrals` screen with loading/error/data states, copy-link action, attribution rows, qualification status, and ledger rows.
- [ ] Show an explicit empty state when no one has qualified; do not show fake RBC credit.
- [ ] Connect registration's referral-code field to attribution after account creation using an idempotency key.
- [ ] Keep fraud/duplicate signals visible as `Under review` rather than silently rewarding or banning.

### Task 3: Verification

- [ ] Run `node --test server/tests/referrals.test.js`.
- [ ] Run relevant auth/API tests, frontend build, and `git diff --check`.

