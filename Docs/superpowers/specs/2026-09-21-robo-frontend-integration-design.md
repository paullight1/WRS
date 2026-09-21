# Feature: ROBO contribution experience and frontend integration

## Document control

| Field                  | Value |
| ---------------------- | ----- |
| Status                 | Draft — user-approved conversational design |
| Phase                  | Phase 2 — trusted network, with a Phase 1 UI foundation |
| Product owner          | WRS product |
| Engineering owner      | WRS platform engineering |
| Trust/compliance owner | WRS trust, risk, and finance operations |
| Last updated           | 2026-09-21 |
| Related decisions      | `Docs/product/PRODUCT_VISION.md`, `Docs/product/REWARDS_AND_REPUTATION.md`, `Docs/product/FEATURE_CATALOG.md`, `Docs/architecture/adr/0003-separate-value-ledgers.md`, `Docs/ia/NAVIGATION.md` |

## Problem and outcome

- **Problem:** The current frontend uses “Mining” as a primary navigation concept and
  mixes deployment, referrals, package access, rewards, and earnings. That makes WRS
  look like a crypto-mining or passive-income product and hides the actual value loop:
  owners train robots, contribute reviewed data, and become eligible for useful work.
- **Target users:** WRS members, robot owners, contributors, and future validators.
- **Desired outcome:** A first-time member understands the next useful action, sees how
  it improves their robot, and can distinguish XP, points, ROBO, pending value, and
  confirmed money without a glossary.
- **Non-goals:** external ROBO trading, ROBO withdrawals, passive-income claims,
  package-based earnings, multi-level compensation, governance authority purchased by
  holding ROBO, or physical-robot ownership claims.

## Product model

ROBO is a scarce utility and participation reward inside the WRS ecosystem. It is not
the user's primary job or identity. The member-facing loop is:

`Own robot → Train robot → Contribute useful work → Review → Improve robot → Earn XP and ROBO eligibility → Use WRS capabilities`

The frontend must preserve these distinct value types:

| Surface | Meaning | Display rule |
| --- | --- | --- |
| Robot XP | Progression of the digital robot profile | Prominent on Robot and contribution completion |
| Points | Promotional/community program score | Never styled as money or ROBO |
| ROBO | Utility reward from verified participation and contribution | Separate status, ledger, and utility explanation |
| Platform credits | Restricted WRS purchasing value | Never combined with ROBO or money |
| Pending money | Conditional financial value awaiting settlement | Explicitly labelled pending |
| Confirmed money | Settled financial value | Shown only in Wallet and eligible programs |

## User journey

### Entry and next action

Home selects one primary recommendation from onboarding, robot training, contribution
quality feedback, consent, available opportunities, or an expiring requirement. It does
not default to a mining CTA.

The recommended action uses plain language such as “Complete a verified Yoruba voice
task” and explains the robot effect, XP, consent, review state, and ROBO eligibility.

### Contribution path

1. Member opens `Contribute`.
2. Member chooses `Train my robot`, `Create AI data`, or `Learn`.
3. The task explains the capability gained, time, quality bar, consent, XP, and ROBO
   eligibility before capture or submission.
4. Sensitive capture requires purpose-specific consent before recording or upload.
5. Submission enters automated and/or human review.
6. Completion shows XP immediately only when its rule permits it; ROBO remains
   `Pending`, `Held`, or `Not eligible` until the authoritative reward event qualifies.
7. The member can open the source event, review feedback, appeal where available, or
   return to the next recommended action.

### Referral path

Referrals are presented as network contribution attribution, not downline income.
Qualification is a visible checklist: account verification, device/fraud checks,
minimum active period, required meaningful contribution, and review completion. Referral
rewards are sourced from the existing free/community allocation and can be reversed.

### Opportunity path

The member-facing label is `Opportunities`; the domain and route may remain `/deploy`.
Opportunity cards show eligibility, customer/work context, rate or program terms, and
the difference between an opportunity and confirmed settlement. Deployment revenue is
created only by the financial program and its reconciliation state.

## Information architecture and UI

### Global navigation

The member mobile shell becomes:

`Home · Robot · Contribute · Opportunities · More`

- `Home` answers “what should I do next?”
- `Robot` shows identity, intelligence profile, growth, and performance.
- `Contribute` unifies robot training, AI data tasks, and learning.
- `Opportunities` exposes approved deployment/work opportunities and active work.
- `More` contains Marketplace, Progress & ROBO, Wallet, Academy, Community, Referrals,
  account, and support.

Marketplace is lower-frequency than contribution and opportunity work. It remains
available contextually from Robot and More rather than competing with the core daily
loop in the five-item mobile bar.

Desktop navigation uses the same groups and labels. Internal route names can be kept
for compatibility, with redirects and canonical analytics names when labels change.

### Home

Replace the current “WRS Mining / Start mining” hero with `Your robot can grow today`
and one next-best contribution CTA. The first viewport contains:

- robot identity and lifecycle state;
- robot XP/level progress;
- contributor quality and accepted-work state;
- ROBO Power and pending/confirmed status without a speculative wealth total;
- four contextual actions at most: continue training, find a data task, view robot
  growth, and view opportunities.

The editable twelve-item shortcut directory is removed from the default Home flow. A
secondary “All tools” destination may expose the full catalog.

### Robot

The Robot surface leads with what changed:

- capability and intelligence profile;
- language, skill, memory, and workflow growth;
- accepted contribution impact;
- contribution quality and robot reputation components;
- ROBO Power explanation as an eligibility multiplier, never as an investment return.

The robot remains the emotional and visual protagonist. ROBO is an outcome of useful
robot-building activity, not the hero object.

### Contribute

Create a unified workspace, likely at `/contribute`, with stable local tabs:

| Tab | Purpose |
| --- | --- |
| Train my robot | Personal voice, language, knowledge, movement, and workflow training |
| Create AI data | Structured consented data tasks and submissions |
| Learn | Courses and certifications that unlock capability or eligibility |

Each task card displays: robot effect, duration, XP, ROBO state, consent category,
quality requirement, and review state. The UI uses `ROBO eligibility after review`
instead of promising a token amount before qualification.

### Progress & ROBO

Replace the standalone conceptual “Rewards” experience with a unified explanatory
workspace at `/progress` or `/rewards` with separate sections/tabs:

- Robot XP
- Points and boosts
- ROBO

The ROBO view contains available, pending, held, and reversed amounts; ROBO Power and
tier; current emission epoch; utility uses; rule/source event links; and a plain-language
“How ROBO works” disclosure. It may show the fixed 1B supply and 200M free/community
allocation, but it must not imply market value or future appreciation.

An advanced disclosure can show emission schedule, current epoch pool, difficulty,
allocation usage, and rule versions. Network-wide operations data belongs in the staff
Operations shell, not the member dashboard.

### Wallet

`Wallet` means confirmed/pending financial value and payout operations. Rename or remove
the combined `Wallet & Earnings` presentation. ROBO is linked from Wallet only as
“Non-cash utility reward” unless a separately reviewed conversion program exists.

### Referrals

Remove paid package activation as a qualification condition. Show referral records,
qualification checklist, pending/qualified/rejected/reversed state, program cap, and
the source allocation disclosure. Do not show downline totals, guaranteed cash, or
leadership authority based on referral volume.

### Packages and Marketplace

Packages communicate capability entitlements and limits only: storage, training volume,
language slots, tools, opportunity categories, analytics, and support. Remove package
comparison language for higher data revenue share, platform rewards, or earnings.

Marketplace items remain approved robot capabilities, skills, language packs, and tools.
The purchase/install state is separate from ROBO reward state.

### Data revenue and deployment revenue

Remove sample or speculative revenue values from demo and preview surfaces. A real
program may show `Estimated`, `Pending`, or `Confirmed` only when its source event,
settlement, deductions, and reconciliation state exist. Empty states should say “No
confirmed distribution yet” instead of inventing a number.

## States and business rules

ROBO status uses explicit states rather than a boolean:

`Eligible → Pending review → Pending qualification → Confirmed`

with alternate outcomes:

`Changes requested`, `Rejected`, `Held for risk review`, `Reversed`, and `Expired`.

Every reward event must include an immutable source event, rule version, allocation or
program budget, idempotency key, qualification timestamp, and reversal relationship.
The UI renders server state; it does not calculate emissions, multipliers, referral
qualification, supply, or balances.

The initial frontend should support the following ROBO snapshot contract:

```ts
type RoboSnapshot = {
  available: number
  pending: number
  held: number
  reversed: number
  power: number
  tier: string
  utilityStatus: 'internal-only' | 'program-enabled' | 'conversion-enabled'
  epoch: {
    name: string
    poolRemaining: number
    dailyPool: number
    endsAt: string
  }
  supply: {
    maximum: number
    issued: number
    allocationRemaining: number
  }
}
```

This is a presentation contract, not permission to invent a backend token ledger. The
authoritative service must own the values and expose stable error/status codes.

## Required removals and terminology changes

| Current surface | Change |
| --- | --- |
| Bottom-nav `Mining` | Replace with `Contribute` |
| Drawer `Mining` | Replace with `Contribute` or `Opportunities` depending on destination |
| Home `WRS Mining` / `Start mining` | Replace with next-best contribution language |
| `/deploy` page title `Mining` | Display `Opportunities`; retain route for compatibility |
| `Wallet & Earnings` | Split into `Wallet` and `Progress & ROBO` |
| Package `Data Revenue Share` and reward comparisons | Remove; show capabilities and limits |
| Referral `paid package activation` condition | Remove; use verified activity checklist |
| Sample referral/revenue values | Remove or label with real status and source event |
| Unbounded Home shortcut grid | Replace with four contextual actions and optional All tools |
| Generic `Earn rewards` copy | Replace with explicit XP/ROBO/pending/confirmed language |

## Roles and permissions

- Members may view their own ROBO snapshot, source events, qualification state, utility
  options, and applicable disclosures.
- Members may submit contributions and referrals but cannot approve their own review or
  qualification.
- Validators may review eligible contributions within scoped credentials but cannot
  mint, edit, or reverse ROBO entries.
- Finance and risk operators may reconcile or hold financial/ROBO program events within
  scoped roles and separation-of-duties controls.
- Administrators may configure epochs and rules through Operations only with versioned
  audit records; frontend member screens never expose administrative mutation controls.
- Suspended or deleted accounts retain the appropriate read-only history and appeal or
  support route; new earning actions are blocked.

## Trust, safety, and compliance

- ROBO is labelled `non-cash utility reward` while conversion is not enabled.
- No screen implies guaranteed earnings, return on package purchase, passive income, or
  future market value.
- Sensitive voice, facial, movement, and biometric-adjacent tasks require specific,
  reversible consent and deletion/withdrawal explanation before capture.
- Referral anti-abuse includes self-referral prevention, device/account linkage checks,
  velocity limits, qualification delay, fraud holds, and reversal support.
- Package tier cannot improve contribution quality, validator authority, or reward
  eligibility except for disclosed access limits under a reviewed program.
- Status is conveyed by text and icons as well as color. All controls retain 44px
  targets, keyboard focus, reduced-motion behavior, and low-bandwidth loading states.

## Analytics and metrics

Success metrics:

- percentage of members completing a meaningful contribution after viewing Home;
- comprehension of XP, points, ROBO, pending money, and confirmed money in user tests;
- accepted contribution rate and contributor quality trend;
- percentage of ROBO events tied to verified source events;
- time from contribution acceptance to visible reward status;
- referral qualification rate with fraud and reversal rates.

Guardrails:

- no increase in package-purchase-driven reward expectations;
- no material rise in low-quality submissions or referral abuse;
- no reconciliation breaks between ROBO events and allocation budgets;
- no increase in consent withdrawal confusion or deletion failures;
- no accessibility regression on contribution and status states.

Canonical analytics names include `contribution_started`,
`contribution_submitted`, `contribution_reviewed`, `robo_status_viewed`,
`robo_utility_opened`, `referral_qualification_viewed`, and
`opportunity_opened`. Analytics must not include email, phone, raw voice, biometric
identifiers, or free-form sensitive content.

## Rollout and operations

### Phase 1: frontend foundation

- Rename navigation and remove mining language.
- Add explicit status vocabulary and disclosures.
- Unify contribution entry points.
- Remove speculative package/referral/revenue claims.
- Keep ROBO in `Coming later` or `Internal utility` state where no authoritative
  service exists.

### Phase 2: verified ROBO program

- Add authoritative ROBO snapshot and event history.
- Add review-linked eligibility and referral qualification states.
- Add emission epoch and allocation disclosures.
- Enable internal utility purchases only after the utility ledger and reversal rules are
  tested.

### Phase 3: advanced network operations

- Add dynamic difficulty, operator/node contribution, program-specific distributions,
  and governance only after legal, financial, safety, and operational gates are met.

Feature flags must allow the ROBO panel, referral rewards, utility actions, and any
emission disclosure to be disabled independently. Rollback must leave the user's source
history visible and must not erase ledger entries.

## Open decisions

1. Final public label for the `/deploy` experience: `Opportunities`, `Work`, or
   `Deploy` with an explanatory subtitle.
2. Whether the unified contribution route is `/contribute` with redirects from
   `/training` and `/data`, or whether existing routes remain canonical and only the
   entry surface is unified.
3. Whether Phase 1 exposes the ROBO tokenomics explanation with all allocation figures,
   or only the fixed-supply and contribution-utility principles until the authoritative
   emission service is live.
