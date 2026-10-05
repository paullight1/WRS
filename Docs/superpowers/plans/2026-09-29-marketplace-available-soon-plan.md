# Marketplace Available Soon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the illustrative Marketplace preview with genuine catalogue entries that cannot be purchased or installed yet and never show sample prices.

**Architecture:** Route member Marketplace views through the production catalogue client. Remove the static demo catalogue, demo filters, count, price/rating labels, preview cards, and checkout actions. Display server catalogue entries as **Available soon** without price; use a neutral empty or unavailable state if the service has no genuine entries.

**Tech Stack:** React, TypeScript, existing ecosystem API/client, Vitest, Node test runner.

**Spec:** `Docs/superpowers/specs/2026-09-29-mining-integration-and-demo-cleanup-design.md`

## Global Constraints

- Do not present static/mock catalogue entries as live products.
- Do not show sample prices, ratings, demo counts, or total item counts.
- Real catalogue entries show **Available soon**, omit price, and cannot initiate purchase/install until the server commerce flow is active.
- Preserve genuine fiat prices in other authorized checkout areas; this Marketplace page does not show a price.
- Remove demo preview disclosures and the “More 4” filter control.
- Keep target branch and source checkout changes isolated.

## Review Focus

- Catalogue API returns an empty array: render a useful empty state without an item count or sample records.
- Catalogue API returns a server error: show retry/unavailable state, not the demo catalogue.
- Product action is activated by click, keyboard, or direct route: it must not start fake checkout/install.
- Product response has no price, rating, or optional descriptive fields: render without `undefined`, zero-price, or invented values.
- Runtime is configured in demo mode: the production Marketplace route must still not render fixture items as live entries.

---

### Task 1: Route Marketplace to genuine catalogue data only

**Files:**
- Modify: `src/App.jsx` (`MarketplaceScreen` selection)
- Modify: `src/screens/Marketplace.jsx`
- Existing: `src/screens/MarketplaceProduction.jsx`
- Existing: `src/infrastructure/ecosystem/browserEcosystemClient.ts`
- Create: `tests/unit/marketplaceAvailableSoon.test.jsx`
- Modify: `tests/plan8/ecosystemContract.test.mjs`

**Interfaces:**
- `browserEcosystemClient.marketplace()` returns only server-approved catalogue versions.
- The member page maps each returned catalogue version to a non-purchasable **Available soon** item, omitting its price.
- The member page never calls `acquire()` or `install()`.

- [ ] **Step 1: Add failing unit and route contract tests** for server catalogue rendering, empty/error states, hidden price/rating/count, and inert Available soon actions.
- [ ] **Step 2: Run** `npx vitest run tests/unit/marketplaceAvailableSoon.test.jsx` and `node --test tests/plan8/ecosystemContract.test.mjs`; confirm expected failures.
- [ ] **Step 3: Route `/marketplace` to the production catalogue client** regardless of demo fixture mode; remove static mock catalogue fallback from the member route.
- [ ] **Step 4: Update the production Marketplace view** to show real entries as Available soon and remove acquire/install handlers and price formatting from this view.
- [ ] **Step 5: Run** `npx vitest run tests/unit/marketplaceAvailableSoon.test.jsx` and `node --test tests/plan8/ecosystemContract.test.mjs`; expect PASS.
- [ ] **Step 6: Commit** as `fix: make marketplace entries available soon`.

### Task 2: Remove preview copy, mock metadata, counts, and extra filters

**Files:**
- Modify: `src/screens/Marketplace.jsx`
- Modify: `src/screens/MarketplaceProduction.jsx`
- Modify: `src/components/AppShell.jsx` only if common demo banner work from the member-data plan has not landed
- Modify: `tests/unit/marketplaceAvailableSoon.test.jsx`

**Interfaces:**
- AppShell title is `Marketplace` with no demo/illustrative subtitle.
- Loading, empty, and unavailable states use existing `StateView` semantics.

- [ ] **Step 1: Add failing copy assertions** for the “Marketplace demo” title, “Illustrative catalogue”, preview disclosure, Plan 8 warning, demo item total, sample ratings/prices, and “More 4” control.
- [ ] **Step 2: Run** `npx vitest run tests/unit/marketplaceAvailableSoon.test.jsx`; confirm failures.
- [ ] **Step 3: Remove the preview warning cards, catalogue total, expandable extra filters, and all mock-only metadata.** Do not replace the implementation warning with another internal-plan explanation.
- [ ] **Step 4: Render a neutral catalogue empty state** when no real rows exist and an unavailable state with retry when the API fails.
- [ ] **Step 5: Run** `npx vitest run tests/unit/marketplaceAvailableSoon.test.jsx`; expect PASS.
- [ ] **Step 6: Commit** as `chore: remove marketplace demo presentation`.

