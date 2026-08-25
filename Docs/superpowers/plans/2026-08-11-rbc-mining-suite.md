# RBC Mining Suite Implementation Plan

> **Status: superseded historical plan.** Do not execute this plan. The accepted IA
> decision replaces “Mining” with contribution-oriented language, and RBC has no
> approved value, conversion, or withdrawal semantics. See
> [`../../ia/DECISIONS.md`](../../ia/DECISIONS.md) and
> [`../../product/REWARDS_AND_REPUTATION.md`](../../product/REWARDS_AND_REPUTATION.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the compressed mining page with a dedicated member mining workspace and protected admin controls for conversion rates and withdrawal review.

**Architecture:** Keep the existing React/Vite client and JSON/Postgres-compatible API. Add a focused `MiningShell` and route-level screens for member mining features, while keeping server-owned balances, rewards, conversion quotes, withdrawals, and audit records behind authenticated API boundaries. Admin authorization is enforced server-side from trusted role data and reflected in a separate admin shell.

**Tech Stack:** React 18, React Router 7, Vite, Node HTTP API, Node test runner, Supabase Auth, PostgreSQL-compatible migrations, existing WRS design tokens.

## Global Constraints

- Transfers, send, receive, and transfer APIs are excluded.
- Weekly recurring missions/events are excluded.
- Automatic withdrawals and automatic conversion settlement are excluded.
- All monetary values use integer minor units in storage and API write contracts.
- Members cannot create reward balances, mission progress, or payout status from the client.
- Admin authorization uses `platform_admin` or `tenant_admin` from trusted server-side role data; never use editable `user_metadata` for authorization.
- Bank details are masked in list responses and excluded from logs.
- Generated artwork is limited to the RBC hero/coin and at most one mining robot illustration.
- Every task adds or updates a focused test before implementation and runs its focused test before reporting completion.

---

### Task 1: Mining, RBC wallet, conversion, withdrawal, and admin API

**Files:**

- Modify: `server/app.js`
- Modify: `server/mining.js`
- Create: `server/rbc.js`
- Create: `server/adminMining.js`
- Create: `supabase/migrations/202608110001_rbc_mining_suite.sql`
- Modify: `server/tests/*.test.js` only for mining and wallet coverage

**Interfaces:**

- Produces the member endpoints and admin endpoints listed in the approved design spec.
- `GET /api/v1/mining` remains backward-compatible with the current dashboard shape.
- New RBC functions expose `createConversionQuote`, `createWithdrawalRequest`, `reviewWithdrawal`, and `markWithdrawalPaid` with explicit state validation.
- Admin authorization accepts only trusted `platform_admin` or `tenant_admin` roles and returns `403` for ordinary members.

- [ ] **Step 1: Add failing API tests** for conversion-rate version snapshots, expired quotes, withdrawal validation, duplicate pending withdrawals, admin-only routes, masked bank details, valid state transitions, invalid terminal transitions, and idempotent mutation replay.
- [ ] **Step 2: Run the focused API tests** and confirm they fail for missing routes/state transitions.
- [ ] **Step 3: Add server-owned RBC and withdrawal collections/adapters** with integer minor units, request IDs, timestamps, state transitions, audit records, and no transfer routes.
- [ ] **Step 4: Add migration tables** for conversion rates, conversion quotes, withdrawal requests, and RBC audit events with ownership, status checks, indexes, and role-safe access boundaries.
- [ ] **Step 5: Add member and admin routes** with bounded inputs, idempotency keys, masked responses, and explicit error codes.
- [ ] **Step 6: Run focused API tests** and verify every new behavior passes.

### Task 2: Dedicated mining shell and route registration

**Files:**

- Create: `src/components/MiningShell.jsx`
- Create: `src/components/MiningNav.jsx`
- Create: `src/components/AdminShell.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/AppShell.jsx` only to preserve existing global navigation handoff
- Modify: `src/index.css` only for mining-shell layout tokens if required

**Interfaces:**

- Consumes screen components at `/mining/*` and admin components at `/admin/mining/*`.
- Exposes desktop rail, mobile bottom navigation, page title area, back-to-global control, and active-route state.
- Member routes: `/mining`, `/mining/missions`, `/mining/power`, `/mining/analytics`, `/mining/activity`, `/mining/boosts`, `/mining/event-code`, `/mining/wallet`, `/mining/leaderboard`.
- Admin route: `/admin/mining`.

- [ ] **Step 1: Add route/navigation tests** asserting the mining shell owns the member routes, the five mobile destinations are present, transfers and weekly missions are absent, and admin routes are guarded.
- [ ] **Step 2: Run focused route tests** and confirm they fail before the new shell/routes exist.
- [ ] **Step 3: Implement `MiningShell`** with the WRS dark industrial visual language and RBC amber/violet accent, keeping content screens responsible for one primary task each.
- [ ] **Step 4: Implement the mobile/desktop nav maps** and register route elements without importing the old compressed dashboard as the primary mining screen.
- [ ] **Step 5: Run focused route tests and a production build** for the shell integration.

### Task 3: Member mining screens

**Files:**

- Create: `src/screens/mining/Overview.jsx`
- Create: `src/screens/mining/Missions.jsx`
- Create: `src/screens/mining/Power.jsx`
- Create: `src/screens/mining/Analytics.jsx`
- Create: `src/screens/mining/Activity.jsx`
- Create: `src/screens/mining/Boosts.jsx`
- Create: `src/screens/mining/EventCode.jsx`
- Create: `src/screens/mining/Leaderboard.jsx`
- Create: `src/lib/miningApi.js`
- Create: `scripts/mining-member.test.js`

**Interfaces:**

- Uses the API contracts from Task 1 through `src/lib/miningApi.js`.
- Does not edit `src/App.jsx`; Task 2 owns route registration.
- Uses loading, empty, error, pending, approved, rejected, claimed, and disabled states rather than fabricated success states.

- [ ] **Step 1: Add failing member behavior tests** for mission claim, boost activation, event-code validation, analytics period selection, activity status labels, and leaderboard category scoping.
- [ ] **Step 2: Run focused member tests** and confirm the new screen behavior is missing.
- [ ] **Step 3: Implement each screen as a focused route** with real API calls, one primary action, and traceable reward/source detail.
- [ ] **Step 4: Add charts using accessible SVG/native markup** and keep chart values derived from API responses.
- [ ] **Step 5: Run focused member tests and verify mobile/desktop route rendering.**

### Task 4: RBC wallet, conversion quote, and withdrawal request UI

**Files:**

- Create: `src/screens/mining/Wallet.jsx`
- Create: `src/components/mining/WithdrawalForm.jsx`
- Create: `src/components/mining/ConversionQuote.jsx`
- Modify: `src/lib/miningApi.js` only to add the wallet methods from Task 1
- Create: `scripts/rbc-wallet.test.js`

**Interfaces:**

- Consumes `GET /api/v1/rbc/wallet`, `GET /api/v1/rbc/conversion-rate`, `POST /api/v1/rbc/conversion-quotes`, `POST /api/v1/rbc/withdrawals`, `GET /api/v1/rbc/withdrawals`, and `GET /api/v1/rbc/transactions`.
- Does not render transfer/send/receive controls.
- Withdrawal form submits bank country, bank name, account name, account number/IBAN, amount, destination currency, and confirmation; it displays `pending` after server acceptance.

- [ ] **Step 1: Add failing tests** for quote snapshot display, amount bounds, required bank fields, masking, pending/rejected/approved/paid states, and absence of transfer controls.
- [ ] **Step 2: Run focused wallet tests** and confirm failure.
- [ ] **Step 3: Implement wallet tabs/sections** for balance, conversion quote, withdrawal request, withdrawal status, and history.
- [ ] **Step 4: Implement validation and safe copy** that distinguishes “request submitted” from “bank payout completed.”
- [ ] **Step 5: Run focused wallet tests and verify the mobile wallet route.**

### Task 5: Admin mining control plane

**Files:**

- Create: `src/screens/admin/MiningAdmin.jsx`
- Create: `src/components/admin/WithdrawalReviewTable.jsx`
- Create: `src/components/admin/ConversionRateEditor.jsx`
- Create: `src/lib/adminMiningApi.js`
- Create: `scripts/admin-mining.test.js`

**Interfaces:**

- Consumes the admin endpoints from Task 1.
- Requires the admin route guard from Task 2.
- Displays masked account details, review notes, rejection reason, payout reference, actor, and audit timestamps.

- [ ] **Step 1: Add failing tests** for ordinary-member denial, rate draft/publish/retire, withdrawal approve/reject/mark-paid, required rejection reasons, required payout references, and audit-row rendering.
- [ ] **Step 2: Run focused admin tests** and confirm failure.
- [ ] **Step 3: Implement the conversion-rate editor** with effective dates, source note, version history, and publish confirmation.
- [ ] **Step 4: Implement the withdrawal queue** with explicit state actions and no automatic payout claim.
- [ ] **Step 5: Implement the audit view and run focused admin tests.**

### Task 6: RBC visual asset and visual integration

**Files:**

- Create: `public/robots/rbc-coin.png`
- Modify: `src/components/mining/RbcHeroArt.jsx`
- Modify: `src/screens/mining/Overview.jsx` only for asset integration

- [ ] **Step 1: Generate one transparent-background RBC coin/robot hero asset** in the approved WRS dark industrial style, with no embedded text that must be localized.
- [ ] **Step 2: Add responsive image loading and an accessible fallback** so the feature works if the asset fails.
- [ ] **Step 3: Verify the asset is compressed and does not appear on every mining screen.**

### Task 7: Integration, review, and browser acceptance

**Files:**

- Modify only files required to resolve integration conflicts found after Tasks 1–6.
- Create: `scripts/mining-suite.test.js` if cross-feature coverage is missing.

- [ ] **Step 1: Run all focused tests and the complete project test suite.**
- [ ] **Step 2: Run the production build and production dependency audit.**
- [ ] **Step 3: Verify desktop and mobile mining navigation in the local browser.**
- [ ] **Step 4: Verify member mission/boost/event-code/wallet flows and admin conversion/withdrawal review flows with safe test data.**
- [ ] **Step 5: Confirm transfer and weekly-event controls are absent and no UI reports an automatic payout.**
- [ ] **Step 6: Review the final diff for mock data, authorization gaps, unmasked bank data, or conflicting route ownership.**
