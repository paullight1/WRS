# Navigation specification

## Global mobile navigation

| Label       | Destination    | Who sees it                      | Purpose                                        |
| ----------- | -------------- | -------------------------------- | ---------------------------------------------- |
| Home        | `/home`        | all members                      | status and best next action                    |
| My Robot    | `/robot`       | activated members                | robot identity, growth, training, performance  |
| Deploy      | `/deploy`      | all members; gated opportunities | find and monitor real available opportunities  |
| Marketplace | `/marketplace` | all members                      | skills, language packs, upgrades, and services |
| More        | `/more`        | all members                      | lower-frequency capabilities and account tools |

The five labels remain stable. A badge may signal pending work, but navigation order does
not change by role or campaign.

## More ordering

Order by member journey and frequency: Training, Add Data, Wallet & Earnings, Points &
Rewards, Academy, Community & Events, Referrals, then role workspaces if granted,
followed by Notifications, Profile, Settings & Security, and Support.

Use **Add Data** as the compact menu label and **Data Contribution** as the page title.
Use **Wallet & Earnings** for the financial hub; do not create competing top-level
labels such as Finance, Revenue, or Income.

## Local navigation

| Section              | Pattern      | Items                                          |
| -------------------- | ------------ | ---------------------------------------------- |
| My Robot             | tabs         | Overview, Training, Performance                |
| Training Center      | tabs         | My Training, Data Tasks                        |
| Data Contribution    | tabs         | Available, In Progress, History                |
| Contribution Quality | subviews     | Score, Feedback, Appeals                       |
| Deploy               | tabs         | Opportunities, Requests, Active                |
| Wallet & Earnings    | tabs         | Overview, Transactions, Programs               |
| Community            | tabs         | Feed, Events, Groups, Leadership               |
| Validator workspace  | tabs/sidebar | Queue, Assigned, Appeals, Quality, Credentials |
| Leadership workspace | tabs/sidebar | Overview, Members, Events, Support, Reports    |

Tabs are limited to five. On small screens, use a select/menu for longer role-workspace
lists rather than a horizontally scrolling mystery tab row.

## Contextual rules

- Home shows one primary recommendation chosen from blocked onboarding, active work,
  expiring consent/credential, review feedback, training, and opportunity eligibility.
- Object details lead with identity/status, then one primary action, then performance,
  history, and settings.
- Package upgrade is contextual to a missing entitlement; it must not obscure a skill,
  quality, identity, availability, or policy requirement.
- Notifications deep-link to the exact submission, review, deployment, transaction,
  event, or support case and preserve a safe return route.
- Destructive or rights-sensitive actions—withdraw consent, delete data/account,
  cancel deployment—show effects before confirmation.

## Role-aware navigation

- Contributor capability appears after task eligibility, not as a separate identity.
- Validator and Leadership workspaces appear only with an active scoped role.
- Suspended/expired roles remove queues immediately and leave a read-only status and
  appeal/support route.
- Enterprise and staff operations have separate shells and sessions appropriate to
  their risk; they do not appear in More.

## Wayfinding and states

- page title matches the navigation label or named object;
- collection → detail uses browser/back-stack plus an explicit close/back label when a
  draft may be lost;
- every empty state explains whether there is nothing yet, the user is ineligible, the
  service is unavailable, or filters removed the results;
- locked features name the exact requirement and do not default to `Upgrade package`;
- prototypes and future services are visibly labeled and cannot be mistaken for live
  commercial availability.

## Route conventions

- plural nouns for collections and stable IDs/slugs for details;
- actions occur through controls/API commands, not ambiguous page names;
- proposed additions: `/data/submissions/:id`, `/data/appeals/:id`,
  `/validator/reviews/:id`, `/leadership/events/:id`, and `/wallet/programs/:id`;
- preserve old routes with redirects when labels or hierarchy move; analytics use a
  canonical screen name independent of the URL.
