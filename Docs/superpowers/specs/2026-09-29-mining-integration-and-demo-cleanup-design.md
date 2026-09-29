# Mining Integration and Demo Cleanup Design

**Status:** Draft for review
**Target base:** `paul/sep-21-1200eea` at `1200eea`
**Audience:** WRS members using the authenticated application

## Goal

Bring the recent server-authoritative XP and RoboCoin mining experience into the Sep 21 WRS application, then make the member-facing product read as a live product rather than a demo. Keep the integration isolated on the preview branch until it is reviewed; do not merge it into `main` as part of this design stage.

## Confirmed requirements

1. Use only the WRS logo asset from the newer checkout. Do not copy its unrelated UI redesign.
2. Add a time-appropriate greeting and the authenticated member's display name to the home header.
3. Place two balance cards directly below the home robot card: XP and RoboCoin (RBC). Read both from authoritative account/progression services; never substitute fixture balances.
4. Rename the primary Deploy navigation entry to **Mining** and use the RoboCoin mark.
5. Make mining the member flow represented by that navigation entry. A member can mine with one eligible robot at one selected worksite at a time.
6. Remove the global demo-data banner, the demo-robot badge, the home authoritative-boundaries explainer, and other user-facing demo-only explanatory copy throughout the app.
7. Make mining overview metrics functional and server-derived. Do not retain illustrative active-unit counts, hours, or performance percentages.
8. Selecting another robot while one is mining must explain that it is locked and what progress unlocks it. Completing a full mining cycle unlocks the next eligible owned robot for a later cycle; an in-progress session cannot switch robots or locations.
9. Replace the Mining page's History tab with a leaderboard of verified RoboCoin mining rewards.
10. Remove Marketplace demo/preview notices, fake counts, filter expansion count, and all sample prices and ratings. Real catalogue entries remain non-purchasable and show **Available soon** without a price until commerce is ready.
11. Make More/account and Wallet pages use the signed-in member's real profile and ledger-backed values. Remove demo account details and demo-only wallet disclosures.

## Member experience

### Home

The header keeps the current WRS shell and gains the WRS logo sourced from the newer checkout, plus a greeting such as “Good morning, Ada.” The greeting uses the authenticated profile name when available and a neutral greeting when it is not.

Immediately after the robot card, a responsive two-column balance area shows XP and RoboCoin. Values have loading, empty, and unavailable states. Missing service data is never displayed as zero unless the service confirms zero. The authoritative-boundaries card is removed.

### Mining and robot selection

The bottom navigation shows the RoboCoin mark and **Mining**. The Mining screen lets an eligible member choose one owned, unlocked robot and one worksite before starting. The authoritative API starts a 24-hour session for that robot/location, applies the configured server rate and limits, and returns the live session snapshot. Only one open session is permitted per member, including concurrent start requests.

Other owned robots appear as locked until the active full cycle settles. Their lock state comes from progression data, not browser state. Selecting a locked robot shows its unlock requirement. Completing a session makes the next robot eligible for a future session; it does not start mining automatically. If no robot, worksite, rule, or production service is available, the UI explains the unavailable state and offers the relevant recovery action without fake stats.

The current session cannot change robot or location after it starts. The worksite shown in the session is the actual selected location, not a hard-coded warehouse scene.

### Leaderboard

Replace the deployment-history tab with a mining leaderboard. Rank members by settled RoboCoin earned in the selected period, with a weekly view as the default and an all-time view available. Show earned amounts for that period, not wallet balances. Use only server-confirmed ledger awards; exclude pending, reversed, and estimated mining amounts. Identify members by public display name, or a generated member handle when no public name is available. Return an explicit empty state when there are no qualifying entries; never fall back to illustrative deployment history.

### Marketplace

Remove the “Marketplace demo” title/subtitle, read-only commerce preview card, Plan 8 implementation warning, demo item count, demo ratings, sample prices, and the “More 4” filter expansion control. Render only entries returned by the real catalogue service. Each real entry remains unavailable for purchase or install until the server-backed commerce flow is ready; display **Available soon**, and omit price. Tapping an entry must not open a fake checkout or imply a purchase can be completed. If the real catalogue service has no entries or is unavailable, show a neutral empty/unavailable state rather than static sample products.

### Member account and wallet

The More/account panel displays the authenticated member's real profile name and account identity from the account service, with loading and unavailable states. It must never substitute `Demo account` or `demo-user`. The Wallet page removes demo-data and illustrative-action banners; balances and history come only from the authenticated ledger-backed wallet. A confirmed zero is shown as zero, while missing or failed data is shown as unavailable. Wallet actions only appear enabled when their real authorization and API flow are active.

### Functional overview metrics

Replace demo deployment metrics with mining metrics derived from the member's authoritative mining snapshot/history:

- **Active robots:** 0 or 1, based on the open session.
- **Mining time:** elapsed time in an active session plus settled session durations.
- **Average rate:** time-weighted RoboCoin per hour from recorded session rate snapshots.

If the API cannot provide a metric, show an unavailable state; do not estimate from sample records.

## Currency and copy rules

All reward, points-conversion, wallet, mining, and member balance displays use **RoboCoin (RBC)** consistently. Existing fiat amounts used for package or payment checkout retain their actual fiat currency and locale; they must not be relabeled as RoboCoin. No user-facing page should describe live account records as illustrative demo data. If a production-backed value cannot be loaded, show a clear unavailable or setup-pending state rather than presenting a fixture as real.

The cleanup covers visible member and operator copy, labels, badges, alerts, and sample summaries across routes. It does not rename internal test fixtures or identifiers where those are not shipped to users. Demo/test fixtures may remain in test-only tooling; they must not back a production member view.

## Backend and data constraints

- Reuse the recent mining API, ledger-backed RoboCoin balance, XP/passport data, configured reward rules, and server-side session settlement where their contracts fit this branch.
- Extend the session contract to bind the selected robot and worksite and return summary metrics from stored sessions.
- Enforce one open mining session per user transactionally on the server/database. The client lock is presentation only.
- Persist unlock progress from settled sessions, with server-side validation. A client cannot unlock a robot by editing local state or calling start directly.
- Build leaderboard rankings from settled, non-reversed RoboCoin ledger awards grouped by member and selected period. Never use current wallet balance as the ranking source.
- Read Marketplace entries from the server catalogue. Until purchase/install contracts are active, expose no price or purchasable action and return an **Available soon** state. Do not ship fixture products through a production member route.
- Read the More/account identity from the authenticated account profile and Wallet values from the user's ledger. Do not use local mock profile or balance data as a production fallback.
- Keep earned XP, RoboCoin, fiat checkout balances, and promotional rewards distinct in storage and presentation.
- Preserve all pre-existing uncommitted files on both the source checkout and the target worktree; selectively port required files rather than merging the source checkout wholesale.

## Production and unavailable states

Remove demo disclosure banners and demo-only badges from the user-facing experience. Production routes must never fall back to mock account, robot, currency, mining, or deployment values. Loading, empty, service unavailable, and operator-configuration-pending states remain explicit and truthful. Development fixtures stay out of production route selection.

## Scope boundaries

- This stage targets the isolated Sep 21 preview branch; it does not change or merge `main`.
- Use only the WRS logo asset from the newer checkout. Keep the Sep 21 app's existing typography, colors, layout, and navigation style except for requested Mining changes.
- Preserve non-mining deployment details where they represent real existing features, but replace deployment history in the Mining tabs with the mining leaderboard, remove fake deployment units, and route members to mining from the primary navigation.
- Preserve the Marketplace route, but render only real catalogue results and disable purchase/install until the real server flow is available. No static demo catalog is relabeled as live.
- Do not change real fiat prices or payment behavior when standardizing reward currency labels.

## Acceptance criteria

1. Home displays the WRS logo, authenticated greeting, robot card, and real XP/RBC cards in the requested order.
2. The primary bottom navigation identifies Mining with the RoboCoin mark.
3. A member can start one session for one unlocked owned robot and selected location; a second robot/location cannot start until the session settles.
4. Concurrent starts, direct API calls, and client-side tampering cannot create multiple open sessions or bypass robot unlocks.
5. Completing a full session unlocks the next eligible robot for a later session, and the UI states the requirement for locked robots.
6. The Mining page has Available, Active, and Leaderboard views; the leaderboard ranks settled RoboCoin awards for the selected period and shows no wallet balances.
7. Mining overview metrics reflect stored server records and update after refresh/settlement; missing data is presented as unavailable.
8. No member-facing route shows demo-data banners, demo-robot labels, fabricated balances, or sample deployment performance.
9. Reward amounts consistently use RoboCoin/RBC while fiat checkout remains denominated in its actual fiat currency.
10. Marketplace contains no sample product names, demo ratings, demo item total, sample prices, or fake checkout; real entries show **Available soon** without a price.
11. More/account and Wallet use authenticated profile and ledger-backed values, with truthful loading/empty/unavailable states.
12. The target preview branch retains its existing unrelated local document edits, and the source checkout remains unchanged.

## Risks and decisions for review

- The source checkout has substantial uncommitted mining changes. Porting them requires a reviewed, selective integration because they are not a clean commit to cherry-pick.
- The current mining schema already serializes user session starts and prevents duplicate open sessions for a robot, but it selects a robot server-side and does not yet implement user-selected worksite binding or sequential robot unlocks. Those require backend/API and likely migration work.
- Marketplace commerce is currently preview-only on this base. The real server catalogue and purchase/install readiness must be verified before listing products. If no genuine catalogue rows exist, an empty state is the truthful production behavior.
- “Average performance” is defined here as time-weighted average RoboCoin mining rate, which is measurable from mining records. If a separate verified robot-performance signal is intended, it needs a source and contract.
- The one-full-cycle unlock rule is the proposed default. Progression remains server-authoritative; changes to its threshold can be made through a reviewed rule if product policy later requires a different threshold.
