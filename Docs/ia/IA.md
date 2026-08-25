# WRS information architecture

## Context

- **Surface:** mobile-first web app, with a future native mobile app and role-based web
  operations dashboards.
- **Primary users:** members/owners, contributors, validators, ambassadors/leaders,
  enterprise customers, and staff.
- **Top member jobs:** grow my robot, find the next eligible activity, and understand
  what changed or what value is confirmed.
- **Constraints:** five-item mobile navigation, low-bandwidth use, first-time users,
  WCAG 2.1 AA, localization, granular permissions, consent, and financial clarity.

## IA thesis

Users primarily think about their **robot and its growth journey**. WRS therefore uses a
frequency-based mobile shell around a lifecycle—**own, train, contribute, deploy,
monitor, earn, upgrade**—while validator, leadership, enterprise, and administrative
complexity appears only in permission-aware workspaces.

## Organizing principle

Primary: **frequency-based** global navigation. Secondary: **lifecycle-based** dashboard
and contextual actions. Role-specific queues use a task-first workspace without changing
the member mental model.

## Navigation model

- **Global:** Home, My Robot, Deploy, Marketplace, More.
- **Local:** 3–5 tabs inside a stable object or workspace.
- **Contextual:** Home and object details offer the single best next action and related
  links.
- **Role workspaces:** Validator and Leadership appear in More only after role grant.
- **Enterprise/Admin:** separate responsive shells; never mixed into member navigation.

## Artifacts

- [App map](SITEMAP.mmd)
- [Navigation rules](NAVIGATION.md)
- [Content/domain model](CONTENT_MODEL.md)
- [Decisions](DECISIONS.md)

## Product vocabulary

| Use             | Meaning                                       | Avoid                               |
| --------------- | --------------------------------------------- | ----------------------------------- |
| Robot profile   | persistent digital identity and capabilities  | physical robot, asset, investment   |
| Package         | platform access tier and entitlements         | investment package                  |
| Opportunity     | available work/application with eligibility   | guaranteed job                      |
| Estimated       | forecast or provisional amount                | balance, earned                     |
| Pending         | verified event awaiting settlement/conditions | available                           |
| Confirmed       | settled monetary ledger amount                | projected                           |
| Data task       | structured contribution assignment            | mining                              |
| Review          | quality decision on a submission              | approval when only one stage passed |
| Dataset release | version approved for a defined license/use    | all approved contributions          |

## Open decisions before Phase 2

- whether Validator and Leadership use dedicated routes in the same client or a separate
  operations client;
- initial launch countries/languages and related identity/financial requirements;
- precise definition of digital deployment versus a simulation/demo state;
- marketplace boundary between WRS-authored skills and third-party developer products.

## Analytics naming

Use `object_action_outcome`, for example `data_task_submit_succeeded`,
`consent_withdraw_requested`, `review_appeal_upheld`, and
`deployment_request_submitted`. Never encode email, phone, free text, or raw biometric
identifiers in analytics properties.
