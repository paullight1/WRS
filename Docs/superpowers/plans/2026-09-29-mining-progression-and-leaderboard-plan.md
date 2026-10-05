# Mining Progression and Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production mining flow that binds each session to one eligible robot and worksite, unlocks robots through settled cycles, and reports real mining activity and rankings.

**Architecture:** Extend the authoritative mining API and Supabase session/progression records first. Expose typed snapshots and leaderboard rows through browser clients, then replace the Deploy primary flow with Available, Active, and Leaderboard views. Keep settlement and eligibility on the server; the UI only reflects those decisions.

**Tech Stack:** React, TypeScript, Node API routes, Supabase/Postgres migrations and RPCs, Vitest, Node test runner.

**Spec:** `Docs/superpowers/specs/2026-09-29-mining-integration-and-demo-cleanup-design.md`

## Global Constraints

- A member has at most one open mining session across all owned robots and worksites.
- A session is 24 hours and binds to its robot, selected worksite, and configured rule snapshot when started.
- The next eligible owned robot unlocks only after a full session settles; no automatic session starts.
- Enforce eligibility and session uniqueness in the server/database; client locks are presentation only.
- Calculate rates and caps from active server rules. Do not invent or hard-code earnings.
- Metrics use persisted session/rule data; leaderboard totals use settled, non-reversed RoboCoin ledger awards only.
- Show no estimated award as a settled balance or leaderboard score.

## Review Focus

- Two concurrent start requests for different robots or worksites: only one open session is created.
- A caller submits a robot they do not own, an inactive robot, or a locked robot: server rejects it without creating a session.
- A client attempts to change worksite/robot after start: the persisted session snapshot remains unchanged.
- A due session is read before and after settlement: metrics and leaderboard include the award only after ledger settlement.
- A leaderboard period has no rows or contains a reversed award: show an empty result and exclude the reversed amount.

---

### Task 1: Mining foundation on the Sep 21 schema

**Files:**
- Create: `supabase/migrations/20260926092033_xp_rbc_mining_foundation.sql` (selectively port and review the newer checkout's foundation migration)
- Create: `tests/plan12/miningDatabaseContract.test.mjs`
- Create: `tests/plan12/miningSafetyReview.test.mjs`

**Interfaces:**
- Produces tables/functions for mining rules, sessions, XP, Mining Power, ledger-backed awards, and server snapshots used by later tasks.

- [ ] **Step 1: Add failing SQL contract assertions** for append-only award ledgers, session immutability, current rule requirements, service-role-only functions, and idempotent settlement.
- [ ] **Step 2: Run** `node --test tests/plan12/miningDatabaseContract.test.mjs tests/plan12/miningSafetyReview.test.mjs`; confirm the expected missing migration/contracts fail.
- [ ] **Step 3: Port and review the foundation migration** against the target branch schema. Preserve its existing identity, robot, consent, and finance invariants.
- [ ] **Step 4: Run** `node --test tests/plan12/miningDatabaseContract.test.mjs tests/plan12/miningSafetyReview.test.mjs`; expect PASS.
- [ ] **Step 5: Commit** the migration and contracts as `feat: add authoritative mining foundation`.

### Task 2: Bind sessions to selected robots and worksites; enforce unlocks

**Files:**
- Create: `supabase/migrations/<generated>_mining_robot_worksite_unlocks.sql`
- Modify: `api/_lib/mining.js`
- Modify: `server/routes/mining.js`
- Modify: `server/routes/mining/start.js`
- Create: `tests/plan12/miningRobotSelectionContract.test.mjs`
- Modify: `tests/plan12/miningDatabaseContract.test.mjs`

**Interfaces:**
- `POST /api/mining/start` accepts `{ robotId: string, worksiteId: string, idempotencyKey: string }`.
- `GET /api/mining` returns the active/recent session, eligible and locked owned robots, approved worksites, and authoritative summary metrics.
- A settled full cycle unlocks the next owned robot for a later cycle; eligibility derives from server records.

- [ ] **Step 1: Add failing contract tests** for selected robot/worksite persistence, ownership and active-lifecycle checks, sequential unlock, one open session per user, and idempotency across concurrent starts.
- [ ] **Step 2: Run** `node --test tests/plan12/miningRobotSelectionContract.test.mjs tests/plan12/miningDatabaseContract.test.mjs`; confirm the new cases fail.
- [ ] **Step 3: Generate the migration with** `supabase migration new mining_robot_worksite_unlocks`; add selected worksite/session binding and database-enforced user-level open-session uniqueness. Keep service-role and RLS boundaries consistent with the foundation migration.
- [ ] **Step 4: Update `wrs_start_mining_session` and the mining API** to validate ownership, lifecycle, unlocked status, approved worksite, and idempotency inside the serialized transaction. Return locked-robot requirements in the snapshot.
- [ ] **Step 5: Run** `node --test tests/plan12/miningRobotSelectionContract.test.mjs tests/plan12/miningDatabaseContract.test.mjs`; expect PASS.
- [ ] **Step 6: Commit** as `feat: bind mining sessions to robot and worksite`.

### Task 3: Typed mining snapshot, summary metrics, and leaderboard API

**Files:**
- Modify: `src/domain/mining/types.ts`
- Create: `src/infrastructure/mining/browserMiningClient.ts`
- Modify: `api/_lib/mining.js`
- Modify: `server/routes/mining.js`
- Create: `tests/plan12/miningLeaderboardContract.test.mjs`
- Create: `tests/unit/miningMetrics.test.ts`

**Interfaces:**
- `MiningSnapshot` contains `session`, `recentSessions`, `robots`, `worksites`, `stats`, and `balance`.
- Each `robots` entry is `{ robotId: string, name: string, unlocked: boolean, unlockRequirement: string | null }`; each `worksites` entry is `{ worksiteId: string, name: string, available: boolean }`.
- `balance` is `{ availableAtomic: string | null, atomicScale: number | null }`; `session` includes its immutable `robotId` and `worksiteId`.
- `stats` is `{ activeRobots: 0 | 1, miningMilliseconds: number, averageRateAtomicPerHour: string | null, atomicScale: number | null }`.
- `GET /api/mining/leaderboard?period=week|all-time` returns `{ period, rows: Array<{ rank: number, memberHandle: string, earnedAtomic: string, atomicScale: number }> }`.
- `browserMiningClient.snapshot()` loads the snapshot; `start({ robotId, worksiteId, idempotencyKey })` starts a session; `leaderboard(period)` loads ranked, settled awards.

- [ ] **Step 1: Add failing unit and API contract tests** for exact atomic conversion, active count, session duration, time-weighted rate, weekly/all-time grouping, and exclusion of pending/reversed awards.
- [ ] **Step 2: Run** `npx vitest run tests/unit/miningMetrics.test.ts` and `node --test tests/plan12/miningLeaderboardContract.test.mjs`; confirm expected failures.
- [ ] **Step 3: Implement snapshot/leaderboard response types and API handlers.** Aggregate only from stored sessions and settled ledger events; never return current wallet balance in leaderboard rows.
- [ ] **Step 4: Implement the browser client** with the stated methods and validation of API response shapes.
- [ ] **Step 5: Run** `npx vitest run tests/unit/miningMetrics.test.ts` and `node --test tests/plan12/miningLeaderboardContract.test.mjs`; expect PASS.
- [ ] **Step 6: Commit** as `feat: expose mining metrics and leaderboard`.

### Task 4: Mining screen, robot locks, and primary navigation

**Files:**
- Create: `src/screens/MiningProduction.jsx`
- Create: `src/components/mining/MiningCyclePanel.jsx`
- Modify: `src/components/AppShell.jsx`
- Modify: `src/components/ui.jsx`
- Modify: `src/App.jsx`
- Create: `tests/unit/miningRobotSelection.test.jsx`
- Create: `tests/unit/miningLeaderboard.test.jsx`

**Interfaces:**
- Mining UI consumes `MiningSnapshot`, `browserMiningClient.start`, and `browserMiningClient.leaderboard` from Task 3.
- The page tabs are `Available`, `Active`, and `Leaderboard`; starting requires an eligible robot and worksite selection.

- [ ] **Step 1: Add failing UI tests** for locked robot explanation, one active robot, immutable active session selection, configured rate display, weekly/all-time leaderboard, and empty/error states.
- [ ] **Step 2: Run** `npx vitest run tests/unit/miningRobotSelection.test.jsx tests/unit/miningLeaderboard.test.jsx`; confirm they fail before implementation.
- [ ] **Step 3: Build the Mining screen and cycle panel** with server-provided robot/worksite choices, accurate loading/unavailable states, rate, timer, settlement history, and server-derived metrics.
- [ ] **Step 4: Update App routing and primary navigation** so `/deploy` opens Mining and displays the coin mark plus “Mining”. Keep real deployment detail routes reachable where already used.
- [ ] **Step 5: Run** `npx vitest run tests/unit/miningRobotSelection.test.jsx tests/unit/miningLeaderboard.test.jsx`; expect PASS.
- [ ] **Step 6: Commit** as `feat: add member mining experience`.
