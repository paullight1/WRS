# RBC Mining Suite Design

**Date:** 2026-08-11  
**Status:** Approved for implementation

## Goal

Turn RBC Mining from one compressed dashboard into a dedicated, mobile-first workspace where every contribution, reward, boost, conversion, and withdrawal has a clear destination, server-owned state, and traceable outcome.

## Scope

### Member workspace

- Mining overview: balance summary, active status, streak, mining power, recent activity, and next actions.
- Daily missions: progress, eligibility, start/continue links, claimable rewards, and claim receipts.
- Special events: event-based missions and event-code redemption. Weekly recurring events are excluded.
- Mining power: level, multiplier, contribution efficiency, streak milestones, boosts, and how-to-increase-power actions.
- Analytics: daily/monthly/all-time RBC earnings, contribution trend, quality trend, mining-power growth, source breakdown, and statistics.
- Activity: approved, pending, rejected, claimed, and settled reward events with evidence/source detail.
- Boosts: catalogue, active boosts, activation, extension, expiry, cost, and server confirmation.
- RBC wallet: available/pending balances, admin-published conversion rate, conversion quote, withdrawal request, request status, and transaction history.
- Event codes: expiring admin-generated codes with idempotent redemption and reward breakdown.
- Leaderboards: top miners, contributors, validators, ambassadors, referrers, cities, and countries where the underlying data is available. Personal identity is minimized outside the signed-in user's own row.

### Explicit exclusions

- User-to-user transfers, send, receive, and transfer APIs.
- Weekly recurring missions/events.
- Automatic withdrawals or automatic conversion settlement.
- Client-created reward balances, mission progress, or payout status.

### Admin workspace

- Conversion-rate versions: draft, publish, retire, effective time, source note, and immutable history.
- Withdrawal review queue: pending, approved, rejected, paid, failed, and cancelled states; masked bank details; review notes; rejection reason; payout reference; and timestamps.
- Admin marks a withdrawal paid only after an external bank payout is completed. The UI never claims that WRS initiated a bank transfer.
- Mining catalogue controls for special events, boosts, event codes, and mission availability.
- Reward and withdrawal audit log with actor, actor role, request ID, before/after values, and reason.

## Information architecture

The member workspace uses a dedicated `MiningShell` rather than the generic compressed `AppShell` layout.

Desktop navigation:

```text
RBC Mining
├── Overview
├── Missions
├── Mining Power
├── Analytics
├── Activity
├── Boosts
├── Event Code
├── RBC Wallet
└── Leaderboard
```

Mobile navigation uses five persistent destinations:

```text
Overview · Missions · Power · Wallet · More
```

`More` contains Analytics, Activity, Boosts, Event Code, and Leaderboard. The global WRS navigation remains available through a back/menu affordance, but mining pages do not render the entire global feature list inside the content column.

Admin routes are isolated under `/admin/mining` and use a role-guarded admin shell. Admin screens are not linked or rendered for ordinary members.

## Data contracts

The existing JSON API remains the compatibility layer during this implementation. New contracts use integer minor units for monetary values and explicit state transitions.

Member endpoints:

```text
GET  /api/v1/mining
GET  /api/v1/mining/missions?scope=daily|special
POST /api/v1/mining/missions/:id/claim
GET  /api/v1/mining/power
GET  /api/v1/mining/analytics?period=day|month|all
GET  /api/v1/mining/activity
GET  /api/v1/mining/boosts
POST /api/v1/mining/boosts/:id/activate
POST /api/v1/mining/boosts/:id/extend
GET  /api/v1/mining/event-codes
POST /api/v1/mining/event-codes/redeem
GET  /api/v1/mining/leaderboard?category=miners|contributors|validators|ambassadors|referrers|cities|countries
GET  /api/v1/rbc/wallet
GET  /api/v1/rbc/conversion-rate
POST /api/v1/rbc/conversion-quotes
POST /api/v1/rbc/withdrawals
GET  /api/v1/rbc/withdrawals
GET  /api/v1/rbc/transactions
```

Admin endpoints:

```text
GET   /api/v1/admin/mining/overview
GET   /api/v1/admin/mining/conversion-rates
POST  /api/v1/admin/mining/conversion-rates
POST  /api/v1/admin/mining/conversion-rates/:id/publish
GET   /api/v1/admin/mining/withdrawals
POST  /api/v1/admin/mining/withdrawals/:id/approve
POST  /api/v1/admin/mining/withdrawals/:id/reject
POST  /api/v1/admin/mining/withdrawals/:id/mark-paid
GET   /api/v1/admin/mining/audit
```

Withdrawal states are `pending → approved → paid`, with `rejected`, `failed`, or `cancelled` terminal alternatives. State changes are idempotent, append an audit event, and cannot be performed by the member client.

Conversion quotes capture the published rate version, source amount, destination currency, fee, expiry, and exact result. A rate change never rewrites historical quotes, wallet entries, or settled withdrawals.

## Authorization and safety

- Member endpoints are scoped to the authenticated user.
- Admin endpoints require `platform_admin` or `tenant_admin` from trusted server-side role data. Supabase `app_metadata` is the source for hosted Auth; editable `user_metadata` is never used for authorization.
- Sensitive bank details are encrypted or protected by the existing server storage boundary, masked in all list responses, and excluded from logs.
- Withdrawal submission requires an amount, destination currency, bank country, bank name, account name, account number/IBAN, and an explicit confirmation. The backend validates bounds, currency, duplicate pending requests, and idempotency keys.
- The admin mark-paid action requires an external payout reference and reviewer note. It records who performed it and does not call a payment provider.
- No UI displays “paid,” “converted,” or “approved” until the server returns the corresponding state.

## Visual direction

Use the existing WRS dark industrial system with a distinct RBC amber-to-violet energy accent. Each screen has one dominant task and one primary action. Dense financial and operational data uses compact rows/tables; explanation and proof-of-contribution use cards and evidence chips.

Use generated artwork only for the RBC hero/coin and, if needed, one mining robot illustration. Charts, status icons, flags, and interaction states remain native UI so they are accessible, responsive, and testable. Do not add decorative images to every screen.

## Testing and acceptance

- Unit tests cover state transitions, conversion quote snapshots, withdrawal validation, admin authorization, idempotency, and leaderboard scoping.
- API tests cover every member mutation, every admin mutation, duplicate/replay attempts, unauthorized access, and terminal-state protection.
- Browser verification covers desktop navigation, mobile bottom navigation, mission claim, boost activation, event-code validation, conversion quote, withdrawal submission, and admin review.
- A member cannot see admin controls, transfer controls, or weekly-event controls.
- A withdrawal request can be submitted and reviewed without pretending that a bank payout was automatically executed.
- Every approved reward and wallet movement can be traced to its source activity or admin action.
