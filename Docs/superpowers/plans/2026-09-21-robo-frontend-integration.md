# ROBO Frontend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the WRS member frontend around robot growth and verified contribution, while introducing a truthful internal-only ROBO explanation without creating speculative balances or earnings claims.

**Architecture:** Keep existing domain/service boundaries. Add a small pure ROBO presentation model for labels, statuses, and program disclosures; use it from shared UI components and screens. Preserve `/training`, `/data`, and `/deploy` compatibility while adding `/contribute` and `/progress` entry surfaces; do not create an authoritative ROBO ledger in this frontend-only phase.

**Tech Stack:** React 18, React Router, Tailwind CSS, existing WRS UI primitives, Vitest, Playwright, ESLint, Prettier.

**Spec:** `Docs/superpowers/specs/2026-09-21-robo-frontend-integration-design.md`

## Global Constraints

- The member mobile shell is `Home · Robot · Contribute · Opportunities · More`.
- ROBO is labelled `non-cash utility reward` while conversion is not enabled.
- The UI renders server state; it does not calculate emissions, multipliers, referral qualification, supply, or balances.
- Packages communicate capability entitlements and limits only; package purchase never creates earnings or contribution quality.
- Sensitive voice, facial, movement, and biometric-adjacent tasks retain purpose-specific consent and deletion disclosures.
- Money uses `Estimated`, `Pending`, `Confirmed`, `Promotional`, or `non-cash` labels; no ambiguous total value is shown.
- Existing user changes in the dirty worktree are preserved; implementation edits must be limited to this feature's files.
- All interactive controls retain 44px targets, keyboard focus, reduced-motion behavior, and accessible text status.

## Review Focus

- A member can enter every renamed route and still recover through browser back/redirects; pin with route and navigation E2E tests in Task 2.
- A contribution cannot appear to promise ROBO before review; pin with status/presentation tests in Task 1 and contribution E2E tests in Task 4.
- A free or paid package cannot imply revenue share or purchased authority; pin with package/referral copy assertions in Task 6.
- Empty, unavailable, locked, pending, held, rejected, and reversed states remain understandable without color; pin with component tests and accessibility checks in Tasks 1 and 7.
- Mobile users see one next action without an overcrowded shortcut directory; pin with Home E2E assertions in Task 3.

## File map

### Shared domain and presentation

- Create `src/domain/robo/types.ts` for ROBO status and non-authoritative presentation types.
- Create `src/domain/robo/presentation.ts` for pure status labels, disclosures, and utility copy.
- Create `tests/unit/roboPresentation.test.ts` for status and copy invariants.

### Navigation and shared UI

- Modify `src/components/AppShell.jsx` for the new primary nav and drawer groups.
- Modify `src/App.jsx` for `/contribute` and `/progress` routes while preserving existing routes.
- Modify `src/components/auth/ActivityGate.jsx` to remove Mining language from lock screens.
- Modify `src/screens/More.jsx` to expose Contribute, Progress & ROBO, Opportunities, and Wallet with distinct wording.
- Modify `src/components/site/content.js` and `src/screens/Landing.jsx` to remove mining/return implications from public copy.

### Member screens

- Modify `src/screens/Home.jsx` to replace the mining hero and shortcut directory with next-action and progress surfaces.
- Create `src/screens/Contribute.jsx` as the unified contribution entry surface.
- Create `src/screens/ProgressRobo.jsx` as the XP/points/ROBO explanatory workspace.
- Modify `src/screens/Training.jsx` and `src/screens/DataContribution.jsx` to link into the unified contribution model and use explicit reward status copy.
- Modify `src/screens/DeployProduction.jsx`, `src/screens/Deploy.jsx`, `src/screens/DeploymentDetails.jsx`, and `src/screens/DeploymentDetailsProduction.jsx` to display Opportunities instead of Mining.
- Modify `src/screens/MyRobot.jsx` to show robot growth and ROBO Power as an eligibility signal.

### Claims and value surfaces

- Modify `src/data/mock.js`, `src/screens/Packages.jsx`, and `src/screens/PackageDetail.jsx` to remove reward/revenue-share package comparisons.
- Modify `src/screens/Referrals.jsx` and `src/screens/ReferralsProduction.jsx` to use verified-activity qualification rather than paid-package qualification.
- Modify `src/screens/DataRevenue.jsx`, `src/screens/ActiveDeployment.jsx`, and `src/screens/ActiveDeploymentProduction.jsx` to remove sample/speculative financial values and show truthful empty/status states.
- Modify `src/screens/Wallet.jsx` and `src/screens/More.jsx` to separate Wallet from Progress & ROBO.

### Documentation and tests

- Modify `Docs/ia/NAVIGATION.md` to make the approved member navigation and route aliases authoritative.
- Modify `Docs/product/REWARDS_AND_REPUTATION.md` with the approved ROBO presentation boundary, keeping ledger implementation separate.
- Modify `tests/e2e/smoke.spec.js` and `tests/e2e/accessibility.spec.js` for the new route and copy contract.

---

### Task 1: Add the pure ROBO presentation model

**Files:**
- Create: `src/domain/robo/types.ts`
- Create: `src/domain/robo/presentation.ts`
- Test: `tests/unit/roboPresentation.test.ts`

**Interfaces:**
- Produces `RoboStatus = 'eligible' | 'pending-review' | 'pending-qualification' | 'confirmed' | 'changes-requested' | 'rejected' | 'held' | 'reversed' | 'expired'`.
- Produces `utilityStatus = 'internal-only' | 'program-enabled' | 'conversion-enabled'`.
- Produces `roboProgramDisclosure()` and `roboStatusLabel(status)` pure functions.

- [ ] **Step 1: Write failing unit tests for the status vocabulary and disclosure**

```ts
import { describe, expect, it } from 'vitest'
import { roboProgramDisclosure, roboStatusLabel } from '../../src/domain/robo/presentation'

describe('ROBO presentation rules', () => {
  it('never labels ROBO as cash while conversion is disabled', () => {
    expect(roboProgramDisclosure('internal-only')).toMatchObject({
      label: 'Non-cash utility reward',
      conversionEnabled: false,
    })
  })

  it('uses explicit labels for review and risk states', () => {
    expect(roboStatusLabel('pending-review')).toBe('Pending review')
    expect(roboStatusLabel('held')).toBe('Held for review')
    expect(roboStatusLabel('reversed')).toBe('Reversed')
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm run test:unit -- tests/unit/roboPresentation.test.ts`

Expected: FAIL because the ROBO domain module does not exist.

- [ ] **Step 3: Implement the minimal pure types and functions**

Use literal unions and a complete status map. `roboProgramDisclosure('internal-only')`
must return fixed-supply/contribution-utility principles, `label: 'Non-cash utility reward'`,
and `conversionEnabled: false`; it must not return a currency or exchange rate.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm run test:unit -- tests/unit/roboPresentation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the domain presentation boundary**

```bash
git add src/domain/robo/types.ts src/domain/robo/presentation.ts tests/unit/roboPresentation.test.ts
git commit -m "feat: add ROBO presentation rules"
```

### Task 2: Reframe global navigation and routes

**Files:**
- Modify: `src/components/AppShell.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/auth/ActivityGate.jsx`
- Modify: `src/screens/More.jsx`
- Test: `tests/e2e/smoke.spec.js`

**Interfaces:**
- Consumes the ROBO labels from Task 1 only where needed; navigation remains route-driven.
- Produces `/contribute` and `/progress` routes, with `/training`, `/data`, `/rewards`, and `/deploy` retained as compatible destinations.

- [ ] **Step 1: Add failing E2E assertions for the new shell**

Add tests that visit `/home`, open the mobile navigation, and assert `Contribute` and
`Opportunities` are present while `Mining` is absent. Add route tests for `/contribute`
and `/progress`, and assert lock screens use `Open Contribute` rather than `Open Mining`.

- [ ] **Step 2: Run the focused E2E test to verify the old shell fails the new contract**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.js -g "navigation|contribute|progress"`

Expected: FAIL because the current shell still labels `/deploy` as Mining and the new routes do not exist.

- [ ] **Step 3: Update primary and drawer navigation**

Change the shared bottom navigation to Home, Robot, Contribute, Opportunities, More.
Keep `/deploy` as the compatibility path behind the Opportunities label. Replace the
drawer’s Mining row with Contribute/Opportunities rows and add Progress & ROBO separately
from Wallet. Remove Mining from ActivityGate copy and its CTA.

- [ ] **Step 4: Add routes with compatibility-preserving screens**

Import `Contribute` and `ProgressRobo` in `src/App.jsx`. Add verified routes for
`/contribute` and `/progress`. Keep `/training`, `/data`, `/rewards`, and `/deploy`
working so bookmarks and notifications do not break.

- [ ] **Step 5: Run focused E2E and lint**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.js -g "navigation|contribute|progress"`

Expected: PASS for the route and shell assertions.

Run: `npm run lint -- --no-error-on-unmatched-pattern`

Expected: PASS.

- [ ] **Step 6: Commit the navigation boundary**

```bash
git add src/components/AppShell.jsx src/App.jsx src/components/auth/ActivityGate.jsx src/screens/More.jsx tests/e2e/smoke.spec.js
git commit -m "feat: reframe member navigation around contribution"
```

### Task 3: Redesign Home around the next useful action

**Files:**
- Modify: `src/screens/Home.jsx`
- Modify: `src/data/mock.js`
- Test: `tests/e2e/smoke.spec.js`

**Interfaces:**
- Consumes the existing `useRobot()` state and Task 1 status/disclosure functions.
- Produces a first viewport with one primary contribution CTA, robot progress, contribution quality, and internal-only ROBO status.

- [ ] **Step 1: Add failing Home E2E assertions**

Assert that Home contains `Your robot can grow today`, a contribution CTA, separate XP
and quality labels, and `Non-cash utility reward`; assert that `WRS Mining` and `Start mining`
are absent. Assert no more than four default contextual action links appear in the primary action group.

- [ ] **Step 2: Run the focused E2E test and verify it fails**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.js -g "Home|robot can grow"`

Expected: FAIL because the current Home renders the mining hero and editable shortcut directory.

- [ ] **Step 3: Replace the Home mining hero and unbounded shortcut directory**

Create a concise next-action card using existing `Card`, `Button`, `Progress`, and
`SectionTitle` primitives. Keep the robot as the visual focal point. Replace the twelve-item
editable shortcut catalogue with four contextual actions and an `All tools` link to More.

- [ ] **Step 4: Add separate progress signals**

Render XP/level, contribution quality/accepted state, and ROBO Power/internal-only status
as distinct values. Do not render a combined value or currency. Use a stable empty state
when robot or contribution data is unavailable.

- [ ] **Step 5: Run focused E2E and accessibility checks**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.js -g "Home|robot can grow"`

Expected: PASS.

Run: `npm run test:a11y -- tests/e2e/accessibility.spec.js -g "home"`

Expected: PASS with no new violations.

- [ ] **Step 6: Commit the Home experience**

```bash
git add src/screens/Home.jsx src/data/mock.js tests/e2e/smoke.spec.js
git commit -m "feat: make Home contribution-led"
```

### Task 4: Build the unified Contribute workspace

**Files:**
- Create: `src/screens/Contribute.jsx`
- Modify: `src/screens/Training.jsx`
- Modify: `src/screens/DataContribution.jsx`
- Modify: `src/screens/TrainingModule.jsx`
- Modify: `src/screens/DataTask.jsx`
- Modify: `src/data/mock.js`
- Test: `tests/e2e/smoke.spec.js`

**Interfaces:**
- Consumes existing training/data mock records and links to existing task detail routes.
- Produces a `/contribute` tabbed entry surface with Train my robot, Create AI data, and Learn tabs.

- [ ] **Step 1: Add failing E2E tests for the contribution workspace**

Assert that `/contribute` shows the three tabs, task cards show robot effect, XP, and
`ROBO eligibility after review`, and sensitive tasks expose consent language before opening.
Assert `/training` and `/data` remain reachable and link back to `/contribute`.

- [ ] **Step 2: Run the focused E2E tests and verify they fail**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.js -g "contribute|training|data"`

Expected: FAIL because `/contribute` is not implemented and existing cards only show XP.

- [ ] **Step 3: Implement the tabbed Contribute screen**

Use existing `Tabs`, `Card`, `Badge`, `Button`, and `StateView` primitives. Keep the
screen low-bandwidth: no new large media, no nested card grids, and one primary action per tab.
Each task must visibly separate robot effect, XP, consent, review, and ROBO state.

- [ ] **Step 4: Add contextual links to existing training/data surfaces**

Add a `Back to Contribute` or `See all contributions` route link to Training and Data
screens. Change generic `Earn rewards` copy to explicit XP/ROBO/pending language. Preserve
capture consent and deletion controls in task/module detail screens.

- [ ] **Step 5: Run focused E2E and format checks**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.js -g "contribute|training|data"`

Expected: PASS.

Run: `npx prettier --check src/screens/Contribute.jsx src/screens/Training.jsx src/screens/DataContribution.jsx src/screens/TrainingModule.jsx src/screens/DataTask.jsx`

Expected: PASS.

- [ ] **Step 6: Commit the unified contribution flow**

```bash
git add src/screens/Contribute.jsx src/screens/Training.jsx src/screens/DataContribution.jsx src/screens/TrainingModule.jsx src/screens/DataTask.jsx src/data/mock.js tests/e2e/smoke.spec.js
git commit -m "feat: unify robot and data contribution entry points"
```

### Task 5: Add the Progress & ROBO workspace

**Files:**
- Create: `src/screens/ProgressRobo.jsx`
- Modify: `src/screens/Rewards.jsx`
- Modify: `src/screens/RewardsProduction.jsx`
- Modify: `src/screens/Boosts.jsx`
- Modify: `src/screens/BoostsProduction.jsx`
- Modify: `src/screens/More.jsx`
- Test: `tests/unit/roboPresentation.test.ts`
- Test: `tests/e2e/smoke.spec.js`

**Interfaces:**
- Consumes Task 1’s pure ROBO presentation functions.
- Produces an internal-only `/progress` screen and preserves `/rewards` as a compatible alias/legacy entry.

- [ ] **Step 1: Add failing tests for the internal-only ROBO surface**

Add a unit assertion that the rendered program disclosure contains no currency symbol,
exchange rate, or withdrawal CTA when utility status is `internal-only`. Add E2E assertions
for separate XP, Points, and ROBO sections and the `non-cash utility reward` disclosure.

- [ ] **Step 2: Run focused tests and verify the current rewards surface fails**

Run: `npm run test:unit -- tests/unit/roboPresentation.test.ts && npm run test:e2e -- tests/e2e/smoke.spec.js -g "Progress|ROBO|rewards"`

Expected: the new rendered surface assertions fail because Rewards currently only presents points/boosts.

- [ ] **Step 3: Implement ProgressRobo without an authoritative balance**

Render XP, points/boosts, and ROBO as separate sections. Use `Internal utility` or
`Coming later` for unavailable authoritative values. Show fixed-supply and contribution-
utility principles, but do not show a live issued amount, pool remaining, exchange rate,
market price, or withdrawal control without a server snapshot.

- [ ] **Step 4: Preserve legacy rewards routes and move boosts into the points section**

Keep event-code and boosts routes functional. Update headings and explanatory copy so
points remain promotional/non-cash and boosts do not look like ROBO multipliers or investment returns.

- [ ] **Step 5: Run focused tests and accessibility checks**

Run: `npm run test:unit -- tests/unit/roboPresentation.test.ts`

Expected: PASS.

Run: `npm run test:e2e -- tests/e2e/smoke.spec.js -g "Progress|ROBO|rewards"`

Expected: PASS.

- [ ] **Step 6: Commit the Progress & ROBO workspace**

```bash
git add src/screens/ProgressRobo.jsx src/screens/Rewards.jsx src/screens/RewardsProduction.jsx src/screens/Boosts.jsx src/screens/BoostsProduction.jsx src/screens/More.jsx tests/unit/roboPresentation.test.ts tests/e2e/smoke.spec.js
git commit -m "feat: add progress and ROBO workspace"
```

### Task 6: Remove misleading package, referral, and revenue claims

**Files:**
- Modify: `src/data/mock.js`
- Modify: `src/screens/Packages.jsx`
- Modify: `src/screens/PackageDetail.jsx`
- Modify: `src/screens/Referrals.jsx`
- Modify: `src/screens/ReferralsProduction.jsx`
- Modify: `src/screens/DataRevenue.jsx`
- Modify: `src/screens/ActiveDeployment.jsx`
- Modify: `src/screens/ActiveDeploymentProduction.jsx`
- Modify: `src/screens/DeploymentDetails.jsx`
- Modify: `src/screens/DeploymentDetailsProduction.jsx`
- Modify: `src/screens/Wallet.jsx`
- Test: `tests/e2e/smoke.spec.js`

**Interfaces:**
- Consumes existing package, referral, finance, and deployment service results.
- Produces truthful UI copy without changing server ledger behavior or inventing ROBO data.

- [ ] **Step 1: Add failing copy-contract E2E assertions**

Assert package pages do not contain `Data Revenue Share`, `Higher data revenue share`,
or package-level earnings comparisons. Assert referral pages do not contain `paid package
activation`. Assert unavailable data revenue/deployment preview states do not show sample
currency amounts as confirmed value.

- [ ] **Step 2: Run the focused tests and verify current claims fail**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.js -g "package|referral|revenue|deployment"`

Expected: FAIL against current mock/package/referral/revenue copy.

- [ ] **Step 3: Remove package reward/revenue claims**

Delete reward/revenue-share comparison rows from mock data and package detail. Replace
them with capability limits, data-task access, storage, training, or opportunity eligibility.
Retain the package disclaimer that packages do not guarantee profit or returns.

- [ ] **Step 4: Replace referral qualification copy and states**

Use verified account, active period, meaningful contribution, and review-window language.
Show pending/qualified/rejected/reversed states. Do not display downline income or referral
volume as leadership authority.

- [ ] **Step 5: Remove sample/speculative financial values**

Use empty/status states when no reconciled program event exists. Keep real contract rates
where they describe an available opportunity, but clearly distinguish them from confirmed
settlement and keep financial labels explicit.

- [ ] **Step 6: Run focused E2E, lint, and commit**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.js -g "package|referral|revenue|deployment"`

Expected: PASS.

Run: `npm run lint -- --no-error-on-unmatched-pattern`

Expected: PASS.

```bash
git add src/data/mock.js src/screens/Packages.jsx src/screens/PackageDetail.jsx src/screens/Referrals.jsx src/screens/ReferralsProduction.jsx src/screens/DataRevenue.jsx src/screens/ActiveDeployment.jsx src/screens/ActiveDeploymentProduction.jsx src/screens/DeploymentDetails.jsx src/screens/DeploymentDetailsProduction.jsx src/screens/Wallet.jsx tests/e2e/smoke.spec.js
git commit -m "fix: remove misleading reward and revenue claims"
```

### Task 7: Synchronize docs, public copy, accessibility, and full verification

**Files:**
- Modify: `Docs/ia/NAVIGATION.md`
- Modify: `Docs/product/REWARDS_AND_REPUTATION.md`
- Modify: `src/components/site/content.js`
- Modify: `src/screens/Landing.jsx`
- Modify: `tests/e2e/accessibility.spec.js`
- Test: existing full test suites

**Interfaces:**
- Consumes all completed member-facing route and terminology changes.
- Produces authoritative navigation/product documentation and verified accessible behavior.

- [ ] **Step 1: Update IA and rewards documentation**

Make `Home · Robot · Contribute · Opportunities · More` authoritative, document the
`/contribute` and `/progress` entry surfaces plus legacy route aliases, and record that
ROBO is a separate non-cash utility/reward presentation from XP, points, and money.

- [ ] **Step 2: Update public landing copy**

Replace public “Build → Train → Deploy → Earn” framing with a contribution-led phrase
such as `Own → Train → Contribute → Work`. Keep approved-work and non-guaranteed-value
disclosures intact.

- [ ] **Step 3: Add accessibility assertions**

Cover `/home`, `/contribute`, `/progress`, `/deploy`, `/packages`, `/referrals`, and
`/wallet` for heading order, named navigation, status text, keyboard focus, and no
color-only state communication.

- [ ] **Step 4: Run the full verification set**

Run:

```bash
npm run lint
npm run typecheck
npm run format:check
npm run test:contracts
npm test
npm run test:a11y
npm run build
```

Expected: all commands pass. If an existing dirty-worktree change causes a failure,
report the exact file and preserve it rather than reverting unrelated work.

- [ ] **Step 5: Review the diff for prohibited language and claims**

Run: `rg -n "Start mining|WRS Mining|paid package activation|Data Revenue Share|Higher data revenue share|guaranteed earnings|passive income" src Docs tests`

Expected: only intentional historical/spec references remain; no member-facing product
surface contains the removed claims.

- [ ] **Step 6: Commit documentation and verification changes**

```bash
git add Docs/ia/NAVIGATION.md Docs/product/REWARDS_AND_REPUTATION.md src/components/site/content.js src/screens/Landing.jsx tests/e2e/accessibility.spec.js
git commit -m "docs: align WRS navigation and ROBO language"
```

## Spec coverage self-review

- Product problem and outcome: Tasks 2, 3, and 7.
- Contribution journey and review-linked reward state: Tasks 1 and 4.
- New navigation and route compatibility: Task 2.
- Robot-first UI and Home simplification: Task 3.
- Unified contribution workspace: Task 4.
- Separate XP, points, ROBO, and money: Tasks 1 and 5.
- Referral anti-abuse presentation: Task 6.
- Package and revenue claim removal: Task 6.
- Accessibility, localization-ready copy, and low-bandwidth behavior: Tasks 4 and 7.
- Rollout/feature-flag boundary: Task 5 keeps ROBO internal-only until authoritative state exists; Task 7 verifies the fallback.

No backend ledger, conversion, exchange, or withdrawal behavior is included in this plan.

