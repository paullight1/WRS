# Admin simplification

Requested outcome: rebuild the WRS admin UI around working features, removing technical clutter and unnecessary context.

Implementation decisions: use the existing React stack and canonical recovered dark checkout. Share one admin interface between `/admin/operations` and the standalone admin. Use a charcoal workspace, orange emphasis, clear typography, grouped navigation, and responsive layouts. Keep the stored light theme available, default new sessions to dark.

Nine existing areas remain: overview, users/KYC, support, finance, deployments, data, trust/safety, rewards, operator access. Each records area gets named collections, search, status filters, meaningful columns, readable detail fields and contextual actions. Historical and read-only records do not expose unrelated actions. Monetary values use currency units; submitted responses are readable. Reward settings separate saved rules, draft configuration and contribution verification. Access keeps exact lookup, scoped roles, justification and self-change protection without a duplicate checklist.

Preserve authentication, permissions, recent MFA, audit reasons and server validation. Connect the existing database RPCs currently omitted by route handlers; do not migrate or alter live data. Distinguish loading, empty, filtered-empty and failed requests. Prevent stale requests or targets from crossing scopes; preserve successful action feedback after refresh. Disable repeated submissions and invalid review scores.

Alternatives considered: cosmetic CSS changes leave the generic forms and duplicated pages; a new framework adds unnecessary complexity. Consolidating the existing React interface best matches the request.

Validation: focused interaction tests, role/action contract tests, builds, and desktop/mobile browser checks with intercepted fixture APIs. No live mutations during verification.

## Follow-up from browser feedback

The Users page must identify people by name and email, with exact server totals for total, active, pending and suspended accounts. Identity checks are a separate page, initially showing pending reviews, with their own oldest-first query so older requests cannot disappear behind the newest registered users. Failed counts show unavailable; failed pending-list reads show an explicit error.

Each operational collection has its own URL (`scope` retains existing API permissions; `page` selects a task). Money contains Payments, Withdrawals and Job payouts. Jobs contains Job requests and Assigned jobs. Data contains Data submissions, Training reviews and Deletion requests. Community contains Referrals and Community reviews. These are collapsible menu groups, not combined collection tabs. Team access and Rewards remain dedicated pages.

A single top header holds the menu button, WRS logo and account menu. The mobile drawer also shows the logo. Remove duplicate breadcrumbs, section captions, secure-session decoration and overview shortcut lists. Use readable cards on narrow screens, keeping names, statuses and actions visible. Hide technical IDs under References in details. Use plain labels such as identity checks, team, jobs and reward rules while preserving API keys, permissions, auditing and financial validation.
