# Trust, safety, and compliance requirements

This document is a product control baseline, not jurisdiction-specific legal advice.
Before launch, qualified counsel and privacy, security, finance, employment, consumer
protection, and AI/data specialists must review each target market and program.

## Truthful product separation

The product and ledger must clearly separate:

- package purchase and platform entitlement;
- digital robot profile control and any future physical-robot title/custody;
- XP, points, upgrades, platform credits, pending money, and confirmed money;
- referral, promotion, contribution, marketplace, and deployment sources;
- estimated performance and completed/reconciled commercial activity.

Packages never guarantee profit, fixed returns, work, universal income, validator
authority, leadership office, or a physical robot.

## Consent and data rights

Consent is specific by data category and purpose. Voice, face, movement, biometric,
language, location, and knowledge uploads require just-in-time explanations covering:

- what is collected and whether identifiers are retained;
- personal-robot use versus dataset/research/commercial use;
- recipients/customer categories and geographic transfers;
- automated and human review;
- retention and deletion behavior;
- reward/distribution terms, if any;
- how to withdraw and any limitation after a licensed release.

Store consent version, timestamp, locale, purpose, data categories, project, status,
withdrawal, and evidence. A general Terms acceptance is not sufficient evidence for a
sensitive-data program.

Users need access, correction, export, withdrawal, deletion, and appeal channels. Data
must be traceable to all derived items and dataset versions so rights requests can be
executed and audited.

## Security baseline

- encryption in transit and at rest, managed secrets, short-lived sessions, revocation,
  least privilege, and strong administrator MFA;
- private object storage, signed upload/download URLs, malware/type/size checks, and
  separation of raw identifiers from curated data;
- rate limits and risk controls for auth, upload, event code, referral, review, wallet,
  and withdrawal operations;
- immutable audit events for role, consent, review, dataset release, reward, wallet,
  export, deletion, and admin actions;
- tested backup, restore, incident response, breach assessment, and vendor controls;
- retention schedules and deletion jobs with evidence of completion.

## Financial and consumer protection

- money is stored in integer minor units with currency and an append-only ledger;
- pending and confirmed funds use different states and cannot be visually conflated;
- withdrawals use identity/risk checks, reconciliation, idempotency, limits, and
  documented failure/reversal handling;
- every reward program identifies the verified activity and complete terms;
- referral rewards depend on legitimate product qualification, not recruitment depth;
- marketing, package comparison, and example earnings are approved and versioned.

## AI and dataset safety

- define permitted/prohibited uses and risk class before collection;
- assess representativeness, bias, label quality, rights, and re-identification risk;
- require specialist review for high-impact domains;
- provide contributor and validator appeals without automated retaliation;
- maintain dataset/model cards, lineage, release manifests, customer usage duties, and
  suspension/deprecation procedures;
- do not use contributor trust scores as broad social scores or infer unrelated traits.

## Community and workforce safety

- clear conduct, harassment, safeguarding, event, and escalation policies;
- leaders and validators receive only scoped, minimum-necessary information;
- disclose when work is volunteer, rewarded participation, contractor work, or another
  legal relationship; do not blur these categories;
- credentials and expert claims are verified and periodically renewed;
- conflicts of interest, whistleblowing, suspension, appeal, and removal are auditable.

## Launch checklist

A feature owner must document data map, risk class, permissions, user disclosures,
retention, abuse cases, audit events, support/appeal route, incident owner, metrics, and
jurisdiction approvals. If an operational control does not yet exist, the public UI
must not imply that the underlying service is available.
