# Plan 8 — Verification Evidence

## Classification

**Code-side production-ready for the Plan 8 scope.**

This classification covers authoritative marketplace ownership/install state, reward points/event codes/boosts, Academy assessment/certificates, community participation/moderation boundaries, and referral qualification. It does not claim that the overall WRS production launch is complete.

## Exact certified head

`30f302f5b7d14e50657427578ec6458a196da39c`

## Fresh evidence

- **WRS Quality Gate:** run `32598229459` — success
  - clean `npm ci`
  - lint — success
  - strict TypeScript — success
  - Prettier — success
  - Plans 1–8 contracts — success (129/129)
  - production build — success
  - unit/integration — success
  - Playwright E2E — success
  - dependency audit — success
- **Plan 8 Ecosystem Database Gate:** run `32598229476` — success
  - PostgreSQL 17 migration chain applies with `ON_ERROR_STOP`
  - marketplace entitlement/purchase/install invariants
  - append-only reward-point accounting
  - hashed/expiring/single-claim event-code rules
  - atomic point-spend boost activation
  - assessment-backed certificate issuance and privacy-safe public verification
  - verified community attendance and append-only moderation
  - self/duplicate-referral prevention and paid-activation review window
- Regression database gates on the same head also passed:
  - Plans 3–4: `32598229455`
  - Plan 5 finance: `32598229610`
  - Plan 6 privacy: `32598229460`
  - Plan 7 deployment: `32598229475`

## Adversarial loop evidence

Event-code redemption originally had no attempt throttling. A RED contract was captured in Quality Gate run `32598123869`, where 128/129 contracts passed and the only contract failure required `enforceRateLimit` in the event-code endpoint. The endpoint was then wired to the existing database-backed distributed limiter, account/IP scoped at 10 attempts per 10 minutes. The subsequent certified quality run passed the complete contract suite.

Other hardening completed during the loop:

- marketplace package compatibility is enforced in the database, not only the UI;
- referral code generation works under hardened empty `search_path` and retries bounded uniqueness collisions;
- privileged event-code issuance, Academy assessment, attendance verification, moderation and referral qualification require internal authorization;
- plaintext event codes are never stored in the database;
- production ecosystem screens are isolated from demo mock data;
- marketplace money uses the Plan 5 ledger, while reward points remain a separate append-only promotional ledger.

## External activation gates

Plan 8 still requires real production infrastructure evidence before the overall WRS launch can be called production-ready:

1. deploy migrations to a dedicated WRS Supabase project;
2. configure production server credentials and internal operator/assessor/moderator/qualifier secrets;
3. seed/review real marketplace publishers, catalogue versions, boost policies, Academy courses and community events;
4. verify live PostgREST/Supabase behavior and production backup/restore;
5. verify live Vercel deployment/runtime logs in the owning Vercel team;
6. enforce required GitHub checks through branch protection/rulesets.

These are activation/governance gates, not replaced by the code-side certification above.
