# Member Data and Demo Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace demo identity, balance, and explanatory UI with authenticated profile and ledger-backed member data, while carrying the WRS logo and greeting into Home.

**Architecture:** Reuse the account, passport, mining, and finance clients instead of creating parallel mock-backed state. Add clear loading, empty, and unavailable states. Remove shared demo notices and sweep user-facing routes for demo/illustrative/sample copy without deleting test-only fixtures.

**Tech Stack:** React, TypeScript, Vite, existing WRS account/mining/finance clients, Vitest.

**Spec:** `Docs/superpowers/specs/2026-09-29-mining-integration-and-demo-cleanup-design.md`

## Global Constraints

- Use only `public/wrs-logo-footer.png` from the newer checkout; preserve the Sep 21 styling.
- Home displays XP and RoboCoin from authoritative services, never fixture values.
- Missing data is not a confirmed zero; show loading, empty, or unavailable state as appropriate.
- Profile identity is from the authenticated account service; never render `Demo account` or `demo-user` as the member.
- Wallet values/history are ledger-backed; reward units use RBC while genuine fiat accounts remain in their real currency.
- Remove member-facing demo, illustrative, read-only-preview, and fake-data explanations. Keep fixtures test-only and out of production route selection.
- Do not modify the source checkout or its uncommitted work.

## Review Focus

- Authenticated member has no display name: use a neutral greeting and real account identifier without throwing.
- XP or RBC service is offline: show unavailable state, not zero or stale mock values.
- Account session expires while More/Profile is open: clear private identity and provide the existing sign-in recovery path.
- A genuine fiat wallet is loaded: preserve its currency; do not relabel it RBC.
- A global copy sweep finds demo terms inside non-user-facing test fixtures: retain those fixtures and remove only shipped UI text.

---

### Task 1: Real member summary interface and Home presentation

**Files:**
- Copy: `public/wrs-logo-footer.png` from the newer checkout
- Modify: `src/screens/Home.jsx`
- Modify: `src/components/AppShell.jsx`
- Modify: `src/infrastructure/account/browserAccountClient.ts` only if the account summary contract lacks required fields
- Modify: `src/infrastructure/mining/browserMiningClient.ts` (created by the Mining plan)
- Create: `tests/unit/memberHomeSummary.test.jsx`

**Interfaces:**
- Home reads `{ displayName, totalXp, roboCoinBalance, atomicScale }` from account/passport/mining services.
- Mining API types/methods come from the Mining plan; do not redefine them here.

- [ ] **Step 1: Add failing UI tests** for the WRS logo, local-time greeting plus authenticated display name, XP/RBC card order, loading, confirmed-zero, and service-unavailable states.
- [ ] **Step 2: Run** `npx vitest run tests/unit/memberHomeSummary.test.jsx`; confirm the assertions fail.
- [ ] **Step 3: Add the logo and greeting** to the Home shell using the profile name; use a neutral greeting if missing. Add responsive XP and RBC cards directly beneath the robot card.
- [ ] **Step 4: Connect cards to account/passport and mining snapshots.** Do not use values imported from `src/data/mock.js` for these balances.
- [ ] **Step 5: Run** `npx vitest run tests/unit/memberHomeSummary.test.jsx`; expect PASS.
- [ ] **Step 6: Commit** as `feat: show verified home balances and greeting`.

### Task 2: More/Profile identity and Wallet truth states

**Files:**
- Modify: `src/screens/More.jsx`
- Modify: `src/screens/ProfileProduction.jsx`
- Modify: `src/screens/Wallet.jsx`
- Modify: `src/infrastructure/account/browserAccountClient.ts` if profile name is not exposed
- Existing: `src/infrastructure/finance/browserFinanceClient.ts`
- Create: `tests/unit/memberIdentityAndWallet.test.jsx`

**Interfaces:**
- Profile reads the authenticated account profile via `browserAccountClient.profile()`; Wallet reads the authenticated ledger via `browserFinanceClient.wallet(currency)`.
- On API failure, render a recoverable unavailable state. Never substitute demo identity or sample money.

- [ ] **Step 1: Add failing tests** for authenticated profile name/id, profile loading/error states, ledger balance/history, confirmed zero, and correct fiat currency formatting.
- [ ] **Step 2: Run** `npx vitest run tests/unit/memberIdentityAndWallet.test.jsx`; confirm the cases fail.
- [ ] **Step 3: Connect More/Profile to the authenticated profile response** and remove `auth.isDemo`-derived user identity from the member card.
- [ ] **Step 4: Remove the demo Wallet page and demo disclosure.** Keep available deposit/withdraw actions gated by their existing server authorization policies; render unavailable state when the ledger cannot load.
- [ ] **Step 5: Run** `npx vitest run tests/unit/memberIdentityAndWallet.test.jsx`; expect PASS.
- [ ] **Step 6: Commit** as `feat: use authenticated member and wallet data`.

### Task 3: Shared and route-level user-facing demo cleanup

**Files:**
- Modify: `src/components/AppShell.jsx` (remove `DemoDataNotice` and demo account label)
- Modify: `src/screens/Home.jsx`, `src/screens/DataRevenue.jsx`, `src/screens/Transactions.jsx`, `src/screens/Checkout.jsx`, `src/screens/DeploymentDetails.jsx`, `src/screens/TrainingModule.jsx`, `src/screens/Support.jsx`, `src/screens/EventCode.jsx`, `src/screens/Verify.jsx`, `src/screens/PaymentSuccess.jsx`, `src/screens/Profile.jsx`, `src/screens/RobotPassport.jsx`, `src/screens/Packages.jsx`, `src/screens/ActiveDeployment.jsx`, `src/screens/Settings.jsx`, `src/screens/Referrals.jsx`, `src/screens/Onboarding.jsx`, `src/screens/Boosts.jsx`, `src/screens/MyRobot.jsx`, `src/screens/DataTask.jsx`, and `src/screens/Customize.jsx`, limited to visible demo/illustrative/sample content and mock production fallbacks
- Inspect but do not indiscriminately remove internal/test-mode logic in `src/components/robot/RobotProvider.jsx`, `src/components/auth/AuthProvider.jsx`, `src/components/data/SensitiveCapture.jsx`, `src/components/site/SiteFooter.jsx`, and `src/lib/runtimeConfig.js`
- Modify: `src/lib/runtimeConfig.js` or `src/App.jsx` only if required to ensure production routes cannot select mock screens
- Create: `tests/unit/noDemoMemberCopy.test.jsx`
- Modify: `tests/plan10/securityLaunchContract.test.mjs` if production route assertions belong there

**Interfaces:**
- Shared production routes use live API clients. Test fixtures and demo-only test branches remain separate from production route selection.
- Common empty/loading/unavailable UI continues to use `src/components/states/StateView.jsx`.

- [ ] **Step 1: Add failing copy/route contract tests** covering the global banner, demo robot label, authoritative-boundaries explainer, wallet disclosure, demo account card, and production mock-route selection.
- [ ] **Step 2: Run** `npx vitest run tests/unit/noDemoMemberCopy.test.jsx` and the focused security launch contract; confirm expected failures.
- [ ] **Step 3: Remove shared demo notice and member-facing demo copy** across routes. For any live-data gap, use StateView loading/empty/unavailable copy; do not silently expose mock values.
- [ ] **Step 4: Keep fixtures reachable only from tests/development** and preserve actual fiat currency labels and non-demo service notices.
- [ ] **Step 5: Run** `npx vitest run tests/unit/noDemoMemberCopy.test.jsx` and the focused security launch contract; expect PASS.
- [ ] **Step 6: Run** `rg -n -i 'demo data|demo account|demo robot|illustrative|read-only .*preview|demo balance|sample balance' src/components src/screens`; inspect remaining hits to verify they are non-shipped code paths.
- [ ] **Step 7: Commit** as `fix: remove mock data from production member views`.
