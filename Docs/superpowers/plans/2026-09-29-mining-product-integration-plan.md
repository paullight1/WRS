# Mining Product Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate authoritative RoboCoin mining and remove user-facing demo data from the Sep 21 WRS preview while preserving the main checkout.

**Architecture:** Execute the mining, member-data/demo-cleanup, and Marketplace tracks as separate plans. Start with member account/XP/RBC interfaces and mining backend contracts, then wire the member UI and Marketplace to those real services. The target is `paul/sep-21-1200eea`; selectively port required implementation from the newer checkout without merging its unrelated or uncommitted changes.

**Tech Stack:** React, React Router, Vite, TypeScript/JavaScript, Node API routes, Supabase/Postgres, Vitest, Node test runner.

**Spec:** `Docs/superpowers/specs/2026-09-29-mining-integration-and-demo-cleanup-design.md`

## Global Constraints

- Use only the WRS logo asset from the newer checkout; keep the Sep 21 visual system otherwise.
- One member can have one open mining session for one owned robot at one selected worksite.
- Session rules, unlocks, balances, leaderboard rows, and mining metrics are server-authoritative.
- Only settled, non-reversed ledger awards count toward leaderboard totals.
- Reward displays use RoboCoin (RBC); actual fiat checkout prices retain their real fiat denomination.
- Never present mock account, robot, balance, deployment, or catalogue data as live data.
- Keep the target branch's pre-existing local edits and the source checkout's uncommitted changes intact.
- Do not merge to `main` in these tracks.

## Track order

1. **Mining backend contract** — complete Mining plan Tasks 1–3 to establish schemas, typed snapshot, and API endpoints.
2. **Member data and demo cleanup** — establish truthful authenticated profile, XP, RBC, and wallet states and remove shared demo notices.
3. **Mining member UI** — complete Mining plan Task 4 using the established API contract.
4. **Marketplace available-soon** — use only server catalogue entries and disable purchases without showing price.

Each track has its own implementation plan:

- [`2026-09-29-member-data-and-demo-cleanup-plan.md`](2026-09-29-member-data-and-demo-cleanup-plan.md)
- [`2026-09-29-mining-progression-and-leaderboard-plan.md`](2026-09-29-mining-progression-and-leaderboard-plan.md)
- [`2026-09-29-marketplace-available-soon-plan.md`](2026-09-29-marketplace-available-soon-plan.md)

## Integration checkpoints

- Keep the Sep 21 preview branch isolated while implementing and reviewing all three tracks.
- Carry the exact API/type contracts from the Mining track into the Home and Marketplace tracks; do not duplicate account or balance fetching logic.
- Complete Mining plan Tasks 1–3 before the member-data plan; complete its Task 4 after member data and the shared shell cleanup.
- After each track, run the named unit and contract tests before moving to the next track.
- After all tracks, run lint, typecheck, focused unit/contract tests, and a production build; inspect the complete branch diff and scan rendered UI copy for demo/illustrative/sample language.
- Review the integrated preview on the branch before proposing any merge to `main`.
