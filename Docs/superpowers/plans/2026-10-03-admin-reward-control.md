# Admin Reward Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give WRS administrators audited control over scoped operator access and reward policy, connect the saved policy to member Rewards and Mining screens, and report truthful Plan 11 readiness.

**Architecture:** Keep all authorization and reward decisions on the server. Add a service-only role lookup/mutation/bootstrap path with append-only audit history, present it in the existing Operations screen, and make RBC economics blank until an operator enters them. Member screens continue to consume authoritative snapshots; Plan 11 remains the sole fail-closed live readiness gate.

**Tech Stack:** React 18, Vite, JavaScript/TypeScript, Node 24, Vercel-style API handlers, Supabase PostgreSQL migrations and service-role RPCs, Vitest and Node contract tests.

**Spec:** `Docs/superpowers/specs/2026-10-03-admin-reward-control-design.md`

## Global Constraints

- Role administration is available only to the existing `admin` role and requires recent MFA, a same-origin request, and a non-empty reason.
- The role UI can grant/revoke scoped operator roles only; full `admin` changes stay outside the UI.
- A user cannot grant/revoke their own roles, and the last active admin cannot be revoked.
- Role state is service-role mediated; client writes to role tables remain denied.
- Grant/revoke success history is append-only and captures actor, subject, role, reason, and time.
- RBC economics start blank; the app must not select or activate a monetary policy by default.
- XP activation and RBC issuance remain separate; this work does not enable production issuance.
- Member-facing reward/mining displays derive from server snapshots, never client-side example rates.
- Plan 11 remains NO-GO until all external evidence gates pass for the exact candidate.
- Preserve all pre-existing worktree changes; stage only files owned by the task if a commit is needed.
- Do not commit unrelated pre-existing changes; if edited files contain pre-existing diffs, preserve the worktree and report that instead of staging the entire file.

## Review Focus

- Exact account lookup must not enumerate or expose unrelated user records; cover exact-match and no-match responses in the role lookup test.
- Self-grant/self-revoke, stale MFA, non-admin, malformed role, blank reason, and last-admin revoke must be denied without changing effective roles; cover in role action authorization tests.
- A revoke must remove permission immediately while preserving its audit event; cover in role mutation integration tests.
- Empty or partial monetary values must never activate RBC; cover with reward editor and reward RPC contract tests.
- Missing Plan 11 provider/human evidence or candidate drift must continue to evaluate as NO-GO; cover with the existing readiness evaluator/contract checks.

---

### Task 1: Role administration database and server API

**Files:**
- Create: `supabase/migrations/20261003182654_admin_operator_role_management.sql` (generated with `npx --yes supabase migration new admin_operator_role_management`)
- Create: `api/admin/role-subject.js`
- Modify: `api/admin/action.js`
- Create: `scripts/bootstrap-initial-admin.mjs`
- Create: `tests/plan9/roleAdministrationContract.test.mjs`
- Create: `tests/unit/adminRoleActions.test.mjs`

**Interfaces:**
- Role lookup accepts an exact email or UUID and returns only the target UUID, minimally necessary account identifier, and current scoped role slugs.
- Role lookup endpoint is `GET /api/admin/role-subject?identifier=<exact-email-or-uuid>` and requires `operations.roles`.
- Role mutation uses the existing `POST /api/admin/action` body shape: `{ action: 'role.grant' | 'role.revoke', userId, role, reason }`.
- Role scope is `operations.roles`, available only to `admin`; role mutations require step-up MFA.
- Database RPC `wrs_admin_set_operator_role(p_operator_user_id uuid, p_subject_user_id uuid, p_role_slug text, p_enabled boolean, p_reason text) returns jsonb` performs guarded transactional mutation and audit append.
- Bootstrap RPC `wrs_bootstrap_initial_admin(p_subject_user_id uuid, p_reason text) returns jsonb` is callable only by `service_role`, succeeds only when no admin exists, and appends a bootstrap audit event.
- Bootstrap script reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WRS_EXPECTED_PROJECT_REF`, and `WRS_INITIAL_ADMIN_USER_ID`; it checks project-ref equality and does not print credentials.
- Lookup response is `{ userId: string, identifier: string, roles: string[] }`; the browser method calls the exact-match endpoint and does not list users.

- [ ] **Step 1: Write role contract and authorization tests** for exact target lookup, scoped roles only, admin-only mutation, MFA required, self-change rejection, unknown-role rejection, non-empty reason, final-admin protection, and bootstrap refusal when an admin already exists.
- [ ] **Step 2: Run the focused tests** with `node --test tests/plan9/roleAdministrationContract.test.mjs` and `npx vitest run tests/unit/adminRoleActions.test.mjs`; confirm the new contract is initially unmet.
- [ ] **Step 3: Add the role audit table and service-only RPCs** in the migration. Seed/use only known scoped role slugs. Keep role reads/writes unavailable to anon/authenticated; enforce self-change, admin-role, last-admin, and actor permission constraints in the RPC transaction.
- [ ] **Step 4: Add exact-match role lookup and guarded role actions** in the admin API. Reuse current session, same-origin, MFA, service RPC, and error conventions. Do not expose general user listing.
- [ ] **Step 5: Add a guarded initial-admin bootstrap script** that refuses missing identifiers, unexpected project refs, absent target accounts, or an existing admin, and invokes only the one-time service-role RPC.
- [ ] **Step 6: Run focused role tests** with `node --test tests/plan9/roleAdministrationContract.test.mjs` and `npx vitest run tests/unit/adminRoleActions.test.mjs`; confirm authorization denials do not mutate state and success writes auditable role events.

### Task 2: Admin role controls in Operations

**Files:**
- Create: `src/components/admin/OperatorAccessPanel.jsx`
- Modify: `src/infrastructure/account/browserAccountClient.ts`
- Modify: `src/screens/AdminOperationsProduction.jsx`
- Modify: `tests/unit/adminRoleActions.test.jsx`

**Interfaces:**
- The panel uses `browserAccountClient.roleSubject(identifier)` for scoped role data and `operationsAction({ action, userId, role, reason })` for grant/revoke.
- The panel is rendered only when `auth.session.roles` contains `admin`; the server remains the authorization boundary.
- Search is exact email/UUID; the panel shows the matched identity, scoped roles, required reason input, MFA state, and grant/revoke controls.

- [ ] **Step 1: Write UI tests** for admin-only visibility, exact-match search, no-match/error/loading states, role grant/revoke payloads, required reason, MFA gating, and refreshed roles after a successful action.
- [ ] **Step 2: Run the focused UI test** with `npx vitest run tests/unit/adminRoleActions.test.jsx`; confirm expected failures before implementation.
- [ ] **Step 3: Build `OperatorAccessPanel`** with accessible labels, explicit confirmation copy, no full-admin option, role-specific controls, and safe empty/error states.
- [ ] **Step 4: Add `browserAccountClient.roleSubject(identifier)`** for the exact-match endpoint and an `access` scope to `AdminOperationsProduction` for full admins; keep the panel isolated from other scope rendering.
- [ ] **Step 5: Run the focused UI test** with `npx vitest run tests/unit/adminRoleActions.test.jsx`; confirm user actions call only the declared API contracts and refresh current roles.

### Task 3: Reward policy defaults and member-facing connection

**Files:**
- Modify: `src/components/mining/RewardRulesEditor.jsx`
- Modify: `src/screens/RewardsProduction.jsx`
- Modify: `src/screens/MiningProduction.jsx`
- Create: `tests/unit/rewardPolicyAdminFlow.test.jsx`
- Modify: `tests/plan12/live-reward-readiness.test.mjs`

**Interfaces:**
- Draft save/activate/pause operations continue to use `browserAccountClient.operationsAction` and existing reward RPCs.
- Member Rewards and Mining pages use `/api/rewards` and `/api/mining` snapshots as their sole source of effective reward values and issuance status.
- No member-facing screen computes RBC from a local preset or displays an inactive draft as an effective rate.

- [ ] **Step 1: Write focused tests** asserting blank initial RBC fields, incomplete economics cannot be submitted as RBC-enabled, XP activation remains independent, member screens show configured values only when authoritative snapshots provide them, and disabled issuance stays explicit.
- [ ] **Step 2: Run the focused test** with `npx vitest run tests/unit/rewardPolicyAdminFlow.test.jsx`; confirm it fails against the current prefilled economics.
- [ ] **Step 3: Clear monetary editor defaults** and replace amount-specific example copy with concise instructions that admins must enter approved rates and limits. Preserve non-monetary example activity/level presets.
- [ ] **Step 4: Connect front-facing Rewards and Mining views to authoritative policy state** where needed; preserve their existing snapshot contracts and fail-closed disabled state.
- [ ] **Step 5: Run the focused reward flow test** with `npx vitest run tests/unit/rewardPolicyAdminFlow.test.jsx` and `node --test tests/plan12/live-reward-readiness.test.mjs`; confirm no client-side rate is inferred and no value is issued by this work.

### Task 4: Readiness reconciliation and final verification

**Files:**
- Modify only as justified by actual verification: `Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json`
- Modify only as justified by actual verification: relevant `Docs/production-readiness/11-live-activation/PHASE-11.*.md`
- Create: `Docs/superpowers/plans/2026-10-03-admin-reward-control-readiness-report.md`

**Interfaces:**
- `npm run plan11:status` reports blockers without converting them to PASS.
- `npm run plan11:gate` is expected to remain non-zero until all live gates have real evidence.
- Evidence candidate hashes are changed only when they attest the exact committed/runtime candidate; no external gate is marked PASS without evidence and owner.

- [ ] **Step 1: Reconcile the recorded release candidate against the final code state** and identify which existing evidence is stale; do not edit external status based on assumptions.
- [ ] **Step 2: Run repository verification**: focused tests from Tasks 1–3, `npm run typecheck`, `npm run build`, and `npm run plan11:status`.
- [ ] **Step 3: Run the strict Plan 11 gate** with `npm run plan11:gate`; record actual blockers and expected NO-GO if external evidence is still absent.
- [ ] **Step 4: Update evidence documents only with verified repository facts**, retain every external blocker, and write a short readiness report that separates completed code-side controls from blocked live gates.
- [ ] **Step 5: Review the final diff and preserved worktree state**; report the resulting files, verification output, bootstrap invocation prerequisites, and the remaining external evidence needed for GO.

## Parallel execution boundaries

- Task 1 owns migration, role APIs, bootstrap, and role API tests.
- Task 2 owns the new role panel and Operations screen integration; it consumes Task 1's exact API contract.
- Task 3 owns reward editor and member-facing policy display; it does not edit role/API files.
- Task 4 begins after Tasks 1–3 and validates the integrated checkout.

Run Task 1 and Task 3 in parallel. Start Task 2 after Task 1's request/response contract is settled. Finish with Task 4 after both UI streams are integrated. Keep each worker on disjoint files and review each result before continuing.
