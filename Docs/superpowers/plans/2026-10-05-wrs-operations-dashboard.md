# WRS Operations Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace the oversized operations overview with compact, permission-filtered WRS queue metrics and keep all record work in its authorized scope.

**Architecture:** The existing operations endpoint will return an overview summary built from exact PostgREST counts, checking each metric permission on the server. The admin overview will render those metrics as responsive navigation cards and retain the existing detailed scope workflows.

**Tech Stack:** Node.js API routes, Supabase/PostgREST service role, React, Vite, existing WRS admin CSS and auth session.

**Spec:** `Docs/superpowers/specs/2026-10-05-wrs-operations-dashboard-design.md`

## Global Constraints

- Preserve the canonical checkout and branch `paul/restored-dark-workspace`.
- The overview summary contains no row identifiers, personal data, monetary amounts, reasons, references, or raw records.
- Check every queue permission on the server; omit inaccessible metrics and distinguish unavailable counts from zero.
- Preserve the existing detailed queue APIs, audited actions, MFA policy, and both admin themes.
- Do not change DNS, deployment configuration, or customer app behavior.

## Review Focus

- An operator with `operations.read` alone must receive no raw records or queue counts.
- A count query failure must not render as zero.
- KYC navigation and its endpoint must require `operations.kyc`, including for crafted scope URLs.
- Account deletion requests must not be confused with data deletion requests.
- Summary cards must work in dark/light themes and at mobile widths.

---

### Task 1: Permission-filtered overview summary

**Files:**
- Modify: `api/_lib/account.js`
- Modify: `api/admin/operations.js`

**Interfaces:**
- Produce summary metrics with stable keys, numeric or status values, a scope, and a ready/unavailable state.
- The overview endpoint continues to require `operations.read`; each metric additionally requires its mapped domain permission.

- [x] Add exact-count and permission-check helpers in `api/_lib/account.js`.
- [x] Produce KYC, support, finance, deployment, data review/deletion, risk, and reward policy metrics only when the corresponding permission is present.
- [x] Mark per-metric query failures unavailable; do not convert them to zero.
- [x] Remove default overview support, account deletion, and audit row arrays from `operationsSnapshot`.
- [x] Require `operations.kyc` for the `users` scope in `api/admin/operations.js`.

### Task 2: Compact overview and metric navigation

**Files:**
- Modify: `admin/src/screens/Operations.jsx`
- Modify: `admin/src/styles.css`

**Interfaces:**
- Consume the summary returned by Task 1 through the existing `browserAccountClient.operations('overview')` request.
- Navigate metric cards to their existing detail scope through the current query parameter.

- [x] Replace the oversized hero and duplicate KPI strip with a compact header and refresh timestamp on the overview.
- [x] Render permission-filtered metric cards, including distinct zero and unavailable states.
- [x] Link each card to its corresponding existing scope; keep detailed queues unchanged below.
- [x] Remove the `users` scope from support-operator navigation while retaining it for KYC operators and admins.
- [x] Add responsive card-grid, skeleton, and status styles that follow the existing light/dark CSS variables.

### Task 3: Review the resulting experience

**Files:**
- No additional files expected.

- [x] Inspect the loaded overview in the running admin app at 1024×768; review the small-screen grid breakpoints in CSS.
- [x] Confirm dark theme, refreshed timestamp, live zero counts, and unavailable/loading rendering branches.
- [x] Review the scoped diff and whitespace checks; the pre-existing worktree changes remain untouched.
- [x] Build the admin workspace in development mode.
