# WRS Operations Dashboard Design

**Status:** Draft for review

## Goal

Make the WRS admin landing page a compact, useful operations dashboard. Operators should see actionable queue pressure and system state at a glance, then open the authorized work queue for details. The overview must stay useful across role-limited accounts without revealing records outside their permissions.

## Current experience and evidence

- The overview hero occupies a large part of the first viewport and repeats information shown again in the four KPI cards below it: record count, available scopes, operator roles, and MFA state.
- Scope and role counts describe access configuration rather than WRS work in progress. A second record count adds little value.
- The current overview snapshot returns recent account deletion requests, support tickets, and audit entries to anyone with `operations.read`. The row lists are capped, so their lengths are not authoritative system totals. Returning these records on the overview also crosses the narrower permissions used by their detail queues.
- The current screen already has separate scope views and APIs for users, support, finance, deployments, data, risk, and rewards. Those remain the source for detailed records and actions.

## Dashboard structure

### Compact page header

- Title: **Operations overview**.
- One short description explaining that cards summarize queues available to this operator.
- Compact session/MFA state, last successful refresh time, and a refresh control.
- Remove the large promotional hero and repeated access-count cards.

### Permission-aware metric grid

Show up to eight compact metric cards in a responsive grid. Include a card only when the server confirms its corresponding scope permission. A card shows a plain-language label, exact count, severity/status treatment where it is meaningful, and a link to the corresponding authorized queue.

| Metric | Definition | Required permission | Destination |
| --- | --- | --- | --- |
| KYC awaiting review | User profiles with `kyc_status = pending` | `operations.kyc` | Users & KYC |
| Open support cases | Tickets in `open`, `in_progress`, or `waiting_user`; urgent count may be a secondary indicator | `operations.support` | Support |
| Withdrawals in progress | Withdrawals in `reserved` or `provider_pending` | `operations.finance` | Finance |
| Deployment requests awaiting match | Requests with `status = requested` | `operations.deployment` | Deployments |
| Data submissions awaiting review | `data_submissions` in `submitted`, `processing`, or `review`, plus `data_task_responses` in `submitted` or `review`; present as one combined count because both record types are available in the Data Review scope | `operations.data` | Data Review |
| Data deletion requests due | `data_deletion_requests` in `requested` or `failed` with `eligible_at <= now()` | `operations.data` | Data Review |
| Trust & safety referrals pending | Referral relationships with `status = pending` | `operations.risk` | Trust & Safety |
| Reward policy state | Active/disabled state for the applicable reward policy, not a fabricated queue count | `operations.rewards` | Rewards |

The metric set is permission-driven, not role-name-driven. Operators may see fewer cards than the table lists. Reward policy state is a compact status card rather than a numeric count. If the source system does not expose a reliable active/disabled policy state, omit that card until its contract is defined; do not infer state from recent events.

### Existing authorized work area

- Keep the current scope selector and detailed operational records below the summary grid.
- Keep search, refresh, paging, record details, audited actions, and MFA step-up in their existing scope workflows.
- Do not put personal data or row previews in metric cards.
- At narrow widths, wrap cards into one column and retain the existing responsive behavior of the record area.

## Summary API and authorization

Add a server-generated overview summary contract rather than deriving totals from the current capped snapshot lists.

- Authenticate the operator and obtain permissions from the server-side session/role source.
- For every metric, enforce its own required scope permission on the server. Do not accept a client-provided permission list as authorization.
- Return only the metrics permitted for that operator. An inaccessible metric is omitted, not returned as zero.
- Use exact database aggregate counts or narrowly scoped aggregate queries. Never use the first page/list length as a total.
- Keep overview summary data non-identifying: metric key, display label or stable key for client localization, integer count (or documented status enum), severity if applicable, target scope, and generation timestamp. Do not return IDs, names, emails, reasons, references, raw records, or row JSON.
- Remove the default overview response's support, deletion-request, and audit row arrays, or otherwise ensure the overview endpoint returns no raw cross-scope records. Detailed record rows stay behind their existing scope permission.
- Keep all mutations on their current APIs and database RPCs. Dashboard cards are read-only navigation affordances.
- The current users endpoint checks `operations.read`, while a dedicated `operations.kyc` permission already exists. Before showing the KYC metric, align the KYC queue endpoint with `operations.kyc`; do not grant this metric merely because an operator has `operations.read`.

An illustrative response shape is:

```json
{
  "generatedAt": "2026-10-05T12:00:00.000Z",
  "metrics": [
    {
      "key": "support_open",
      "value": 12,
      "severity": "attention",
      "scope": "support"
    }
  ]
}
```

The actual contract should use existing API conventions and must not disclose whether hidden queues contain records.

## States and interaction

- **Loading:** compact skeleton cards with stable dimensions.
- **Loaded:** exact counts as of `generatedAt`; refresh updates the timestamp and cards.
- **Zero:** show `0` as a real value and link to the queue so the operator can inspect it.
- **Unavailable:** distinguish a failed metric from zero; show a retry affordance and do not silently omit a metric because its query failed.
- **No permitted metrics:** explain that no overview queues are assigned and provide only navigation to scopes already authorized.
- **Permission denied/session expired:** use the existing auth and access-denied flow; never fall back to cached privileged data.
- Refresh should be user-triggered and may also occur on entering the overview. Do not add aggressive polling in this change.

## Visual behavior

- Preserve the current WRS admin shell and approved light/dark themes.
- Reduce vertical space above the metrics so the dashboard presents useful work data in the initial viewport.
- Use consistent compact card heights, clear labels, tabular numerals, and restrained status colors that remain legible in both themes.
- Avoid decorative charts. The current data contract has no trustworthy time series for queue history, so v1 focuses on current workload counts.
- Keep the grid usable at desktop, tablet, and phone widths; avoid horizontal scrolling for the metric cards.

## Security and data integrity

- Queue counts are sensitive operational metadata and are subject to the same least-privilege boundary as the detailed queue.
- The API must apply permission checks independently for each queue family and must not trust route/query parameters to grant access.
- Summary query failures must not be represented as `0`.
- Counts must use documented status conditions and server-side time. Due data deletion requests require the eligibility timestamp condition. Queue counts must not include the separate account-deletion workflow unless it receives its own explicit permission and matching detail destination.
- Do not surface monetary totals, payout amounts, PII, or audit-event details on the overview.

## Non-goals

- New operator roles, permissions, or mutation capabilities.
- Changes to the existing detailed queue action flows or MFA policy.
- Historical charts, trends, forecasts, or polling infrastructure.
- Changing the customer application, admin authentication, deployment topology, or domain setup.

## Acceptance criteria

- The oversized hero and duplicate access-summary cards are removed; the title, security state, refresh time, and refresh action fit in a compact header.
- The initial desktop viewport shows the header and useful queue metrics without the hero pushing work below the fold.
- Metric cards correspond to WRS domain queues or policy status, not redundant role/scope counts.
- Each metric appears only for operators authorized for its scope, as enforced by the API.
- Overview returns no raw cross-scope support, deletion, or audit records to `operations.read` alone.
- Counts are exact aggregates, use the reviewed status predicates, and distinguish zero from failed/unavailable.
- Cards navigate only to the matching scope; all record details and actions remain in the permission-checked scope pages.
- Layout, status contrast, loading, empty, unavailable, and session/access states work in both themes and at narrow widths.

## Open implementation checks

- Confirm the authoritative KYC, support, data submission/task, deletion, deployment, and referral predicates against the latest migrations before coding.
- Determine the smallest authorization adjustment needed so the KYC metric and its destination use the existing `operations.kyc` permission rather than `operations.read` alone.
- Determine whether a reliable single reward-policy status exists for the operator overview. If not, omit that metric from v1.
- Choose the smallest API/database implementation that returns permission-filtered aggregates without pulling entire tables into application memory.
- Confirm how the `operations.kyc` role grant should map to the existing Users & KYC navigation and endpoint, which currently use `operations.read`.
