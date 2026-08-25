# Content and domain model

The model uses user-facing entities while preserving the distinctions needed for
permissions, audit, data lineage, and trustworthy money handling.

## Core entities

| Entity                | User meaning                               | Key identity/state                                 | Primary surfaces               |
| --------------------- | ------------------------------------------ | -------------------------------------------------- | ------------------------------ |
| Account               | person or organization using WRS           | account ID, verification, locale, status           | profile, security, admin       |
| Robot profile         | member's persistent digital robot          | robot ID, package entitlement, level, capabilities | Home, My Robot, Passport       |
| Package entitlement   | access features and limits                 | plan, purchase/subscription, start/end, status     | Packages, Robot, Admin         |
| Training module       | guided robot/member learning               | modality, requirements, progress, completion       | Training, Academy              |
| Consent record        | permission for a defined purpose           | subject, category, purpose, version, status        | capture, Settings, privacy ops |
| Data project          | instructions and rules for producing data  | sponsor, purpose, risk, rubric, eligibility        | Data, enterprise/admin         |
| Data task             | assignable unit of a project               | type, language, skill, deadline, reward rule       | Data Contribution              |
| Submission            | contributor's versioned work               | contributor, source, consent, files, state         | task detail, history           |
| Review                | validator decision on a submission/release | reviewer scope, rubric, outcome, confidence        | validator workspace            |
| Appeal                | challenge to a review or score             | appellant, reason, adjudicator, outcome            | quality, validator/admin       |
| Dataset version       | curated set with a release manifest        | lineage, consent coverage, quality, license status | enterprise/data ops            |
| Opportunity           | available digital/physical service role    | customer, requirements, availability, terms        | Deploy                         |
| Deployment            | accepted assignment and activity           | contract, robot/device, state, performance         | Active Deployment              |
| Value account         | one type/currency of value                 | XP/points/credit/money, owner, status              | Wallet, Rewards                |
| Ledger entry          | immutable value change                     | source event, amount, state, reversal link         | transactions, finance ops      |
| Community             | geographic or program group                | scope, leaders, members, rules                     | Community, Leadership          |
| Event                 | approved meeting/activity                  | organizer, time, location, code policy             | Community, Rewards             |
| Role grant            | scoped authority/credential                | role, subject, scope, dates, issuer, status        | role workspace, Admin          |
| Marketplace item      | installable capability/service             | publisher, compatibility, entitlement, status      | Marketplace                    |
| Support/incident case | request, dispute, safety, or fraud issue   | reporter, category, severity, owner, state         | Support, Admin                 |

## Key relationships

- An Account controls zero or one primary Robot profile in the MVP; fleet ownership is
  a future explicit model, not an overloaded package field.
- A Package entitlement grants capabilities/limits to an Account or Robot profile; it
  does not grant Role authority or reputation.
- A Submission belongs to one Data task and contributor, references one or more Consent
  records, and has many Reviews and Appeals.
- A Dataset version contains immutable references to curated Submission versions and
  transformations, not mutable copies without lineage.
- A Role grant gives an Account limited authority over a Community, Data project,
  geography, or operational function.
- A Ledger entry references exactly one source event/reward rule and may be corrected
  only with linked reversal/replacement entries.
- A Deployment links a Robot profile to an Opportunity; a future physical deployment
  must also link a separately identified device, operator/custodian, and safety record.

## Important state machines

```text
Submission: Draft → Submitted → Auto review → Human review → Accepted/Rejected/Changes requested
Dataset: Draft → Collecting → Reviewing → Release candidate → Approved → Licensed → Deprecated
Deployment: Requested → Eligible → Offered → Confirmed → Active → Paused/Completed/Cancelled
Role grant: Applied → Active → Suspended → Expired/Revoked
Money: Estimated (not ledger) → Pending ledger → Confirmed ledger → Withdrawn/Reversed
```

States may skip only through documented administrative commands. State changes record
actor, reason, timestamp, prior/new state, policy/rule version, and request ID.
