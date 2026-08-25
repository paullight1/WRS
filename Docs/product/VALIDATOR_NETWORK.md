# AI validator network

## Purpose

The validator network converts raw contributions into trustworthy, traceable data. It
uses automated checks, calibrated human review, specialist escalation, and auditable
release approval. Validation determines data quality; it does not determine legal
permission to use the data, which comes from consent and licensing records.

## Review pipeline

`Draft → Submitted → Automated review → Human review → Specialist review (when required) → Release approval → Approved dataset`

Any stage may produce `Changes requested`, `Rejected`, `Quarantined`, or `Appealed`.
Acceptance into the contribution system is distinct from release into an enterprise
dataset.

## Validator levels

| Level | Name                   | Allowed work                                                                   | Eligibility                                                                           |
| ----- | ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1     | Community Validator    | completeness, obvious label errors, task-instruction checks                    | verified account, training, calibration threshold, good standing                      |
| 2     | Professional Validator | language accuracy, transcription/translation, image/audio quality              | sustained Level 1 quality plus domain/language assessment                             |
| 3     | Expert Validator       | high-risk or specialist medical, legal, finance, engineering, agriculture work | verified credentials where required, jurisdiction and conflict checks                 |
| 4     | Master Validator       | release-readiness review and final QA within an authorized program             | proven expert record, release training, explicit appointment and separation of duties |

A level is a credential with scope and expiry, not a permanent status. Package purchase
may provide training tools but never validation authority.

## Assignment and review rules

- reviewers cannot validate their own contributions or work from a declared conflict;
- identity is blinded where practical to reduce favoritism and retaliation;
- high-risk data requires two-person or specialist review based on project policy;
- golden/calibration items are mixed into queues and do not disclose their status;
- rubrics, versions, decisions, annotations, and elapsed time are retained;
- consensus and escalation thresholds are configured per project and risk class;
- Master Validators approve a release manifest, not an unbounded dataset category;
- staff may quarantine data immediately for safety, rights, or privacy concerns.

## Contributor quality score

The displayed score is explainable and versioned. Inputs may include:

- accuracy against consensus or adjudicated truth;
- completeness and instruction adherence;
- consistency across similar tasks;
- acceptance and correction history;
- confirmed policy violations;
- task difficulty and confidence, so hard work is not unfairly penalized.

Protected traits, package tier, referral count, community title, and purchase history are
excluded. New contributors receive an uncertainty-aware provisional score. Users can
see material factors, request correction, and appeal decisions.

## Validator quality and rewards

Validator performance uses agreement with adjudication, gold-set accuracy, missed-error
rate, false-rejection rate, appeal overturn rate, and policy compliance. Raw speed or
volume cannot dominate the score.

Rewards can include XP, credentials, badges, learning access, platform credits, or
project fees. A review becomes reward-eligible only after quality checks; collusion,
rushed reviews, or undisclosed conflicts can trigger reversal, retraining, suspension,
or removal.

## Dashboard requirements

- queues grouped by credential, language, risk, and deadline;
- rubric and task context visible beside the item;
- accept, request changes, reject, flag, abstain, and escalate actions;
- confidence and reason codes required for material decisions;
- calibration, agreement, appeal, and credential-expiry views;
- no contributor contact, identity, package, referral, or wallet data unless essential;
- accessibility and low-bandwidth draft support.

## Appeals and adjudication

Contributors receive a reason code and actionable explanation. An appeal is assigned to
a different qualified reviewer or staff adjudicator. The original decision, appeal,
outcome, score impact, and any reward correction remain in the audit history.

## Release gates and metrics

Before Levels 1–2 launch: versioned rubrics, calibration sets, minimum agreement
thresholds, appeals, staff audit sampling, conflicts, and suspension controls must work.

Before Levels 3–4 launch: credential verification, specialist liability rules,
two-person controls, dataset release manifests, and domain-specific safety policies must
be approved.

Key metrics are gold-set accuracy, inter-reviewer agreement, false accept/reject rates,
appeal overturn rate, time to decision, quality incidents after release, and performance
disparities by language/region where lawful to assess.
