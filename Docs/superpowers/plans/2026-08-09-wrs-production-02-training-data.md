# WRS Production Track 2: Training, Capture, and Data Contributions

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Ten agents may work in isolated branches or terminals; integrate only through reviewed contracts and migrations.

**Goal:** Turn training, voice/face/movement capture, data tasks, provenance, quality review, and data revenue into safe, auditable, production-ready workflows.

**Architecture:** Use a server-owned task state machine and a separate media-ingestion pipeline. Metadata, consent, provenance, review, and financial eligibility remain transactional; binary files live in private object storage and are processed asynchronously. A submission is never approved or payable merely because a client uploaded it.

**Tech Stack:** React 18/Vite, Node.js API, PostgreSQL, private object storage, signed upload URLs, malware scanning, queue/worker runtime, review dashboard, immutable audit records.

## Global Constraints

- Voice, face, movement, image, and video data are sensitive and require purpose-specific consent.
- Client-side completion, quality, approval, and revenue claims are not authoritative.
- Every task mutation is owner-scoped, tier-checked, idempotent, and auditable.
- Raw media is private by default; signed URLs are short-lived and scoped.
- Review, approval, rejection, appeals, and settlement are distinct states.
- Retention and deletion policies must be executable, not only documented.

## Current Baseline

- Training API and rules: `server/app.js`, `server/seed.js`
- Data task rules: `server/dataTasks.js`
- Training screens: `src/screens/Training.jsx`, `TrainingModule.jsx`
- Data screens: `src/screens/DataContribution.jsx`, `DataTask.jsx`, `DataQuality.jsx`, `DataRevenue.jsx`
- Current behavior: text task submission works; media capture/upload, quality review, provenance, and revenue settlement are blocked.

## Parallel Execution Model

Agents 1–10 work in separate branches. Agent 5 owns the canonical task state machine and migration names; Agents 3 and 4 consume its interfaces. Agent 8 owns payable eligibility and must not bypass review. Integration proceeds 1 → 2 → 5 → 6 → 7 → 8, with 3, 4, 9, and 10 integrated after their contract tests pass.

## Agent Workstreams

### Agent 1 — Training catalogue and curriculum domain

**Own:** `server/training/`, training migrations, module API, `Training.jsx`, catalogue contract tests.

**Deliver:** versioned modules; objectives; required tier; supported modality; prerequisites; estimated duration; active/inactive publishing; localized labels; instructor/admin ownership.

**Required tests:** unpublished modules are hidden; module versions remain stable for existing completions; tier/prerequisite checks are server-side; unsupported modalities cannot be started.

**Acceptance:** Training catalogue data comes from the server and every active module has an owner, version, modality, completion rubric, and retention classification.

### Agent 2 — Completion, assessment, and XP integrity

**Own:** training completion service, assessment records, XP ledger integration, `TrainingModule.jsx`, completion tests.

**Deliver:** attempt state; assessment evidence; pass/fail rules; retry limits; idempotent completion; XP award ledger event; instructor override with audit.

**Required tests:** completion cannot be posted for an unstarted module; repeated completion awards XP once; failed assessment does not award XP; override is role-protected and audited.

**Acceptance:** Client navigation cannot mark a module complete. XP is derived from a server event, not a local increment.

### Agent 3 — Capture provider adapters

**Own:** `server/capture/`, provider interfaces, capture routes, `TrainingModule.jsx`, `DataTask.jsx` capture controls.

**Deliver:** adapter interface for voice, face, movement, image, and video capture; capability discovery; device permission handling; pause/resume; checksum; retry; provider failure states.

**Required tests:** provider timeout leaves the task resumable; unsupported browser/device is explicit; duplicate capture cannot create duplicate submissions; captured content is linked to the correct consent and task.

**Acceptance:** A sandbox provider can complete one capture path end-to-end; all other paths remain visibly unavailable without implying success.

### Agent 4 — Private media storage and processing pipeline

**Own:** `server/media/`, object-storage adapter, upload routes, worker/queue integration, malware scanning, media tests.

**Deliver:** short-lived signed upload URLs; private bucket policy; content-type and size enforcement; checksum verification; malware scan; transcoding/normalization; quarantine; deletion job; access audit.

**Required tests:** public URL access fails; wrong MIME or oversized payload is rejected; malicious fixture is quarantined; expired URL fails; deletion removes derivatives; processing retries are idempotent.

**Acceptance:** No media is stored in the repository, browser local storage, or public bucket. Every access is attributable to a user, reviewer, service, or purpose.

### Agent 5 — Task assignment and submission state machine

**Own:** `server/dataTasks.js`, task migrations, assignment/submission API, `DataContribution.jsx`, `DataTask.jsx`.

**Deliver:** explicit states: `available`, `accepted`, `in_progress`, `submitted`, `under_review`, `changes_requested`, `approved`, `rejected`, `appealed`, `expired`; assignment lease; idempotency; pagination; concurrency conflict handling.

**Required tests:** one owner per assignment; expired assignment cannot submit; resubmission follows policy; cross-user access fails; duplicate request replays the same result; approval cannot occur from a client submission endpoint.

**Acceptance:** Every task transition is server-authorized, timestamped, actor-attributed, and visible in a history endpoint.

### Agent 6 — Consent, provenance, and rights management

**Own:** `server/consent/`, provenance schema, consent UI, policy docs, privacy tests.

**Deliver:** purpose/versioned consent; participant disclosure; source/device metadata; dataset lineage; license/rights status; withdrawal handling; retention deadline; redaction/anonymization record.

**Required tests:** capture without consent is rejected; consent withdrawal prevents new processing; provenance cannot be edited without an audited correction; a dataset release fails if rights coverage is incomplete.

**Acceptance:** A reviewer can answer who contributed data, under which consent, from which task/version, how it was processed, and whether it may be released.

### Agent 7 — Review, quality, and appeals

**Own:** review service, reviewer roles, rubrics, calibration, `DataQuality.jsx`, review tests and reviewer runbook.

**Deliver:** human/automated review queue; rubric versioning; blind review where appropriate; calibration set; conflict-of-interest rules; rejection reasons; change requests; appeals; QA metrics.

**Required tests:** contributor cannot review their own work; reviewer permissions are scoped; approval requires rubric evidence; appeal creates a new decision record; reviewer actions are immutable and audited.

**Acceptance:** `submitted` never means `approved`; quality status and reviewer identity are server-derived and explainable.

### Agent 8 — Revenue eligibility and settlement boundary

**Own:** `server/dataRevenue/`, eligibility rules, ledger event interface, `DataRevenue.jsx`, financial tests.

**Deliver:** explicit approved-to-eligible-to-settled transitions; rate-card versioning; payout holds; correction/reversal; tax/regulatory flags; reconciliation interface.

**Required tests:** submitted/rejected data cannot create payable balance; duplicate settlement is impossible; reversal preserves an audit trail; rate-card changes do not rewrite historical earnings.

**Acceptance:** UI only displays settled or pending values returned by the ledger; no data contribution creates money without approved review and reconciliation.

### Agent 9 — Contributor UX, accessibility, and resilience

**Own:** training/data screens, loading/error/empty states, consent copy, retry UX, accessibility tests.

**Deliver:** truthful progress states; resumable tasks; keyboard/screen-reader support; clear sensitive-data warnings; network retry without duplicate mutation; provider-unavailable states; localization-ready copy.

**Required tests:** refresh during upload preserves safe state; retry reuses idempotency key; inaccessible controls are corrected; all success messages map to a confirmed server response.

**Acceptance:** A contributor can understand what was captured, submitted, approved, rejected, or paid without relying on hidden client state.

### Agent 10 — End-to-end data release audit

**Own:** cross-domain integration tests, staging fixtures, threat model, retention drill, `docs/production-readiness.md` updates.

**Deliver:** sandbox flow from consent → capture → upload → processing → submit → review → approval → eligibility → settlement; failure injection; deletion/withdrawal drill; compliance evidence bundle.

**Required tests:** malware failure, provider timeout, reviewer conflict, revoked consent, duplicate webhook/job, database rollback, object-storage outage, and export/deletion behavior.

**Acceptance:** No P0/P1 privacy, media, review, provenance, or payout-integrity issue remains open; sensitive-data release is blocked unless all gates pass.

## Track Release Gate

- [ ] Consent and rights records exist before sensitive capture.
- [ ] Private storage, malware scanning, quarantine, retention, and deletion work.
- [ ] Task state machine is explicit and fully audited.
- [ ] Review and appeals are separate from contributor submission.
- [ ] Provenance covers source, consent, processing, and release status.
- [ ] Revenue requires approved data and reconciliation.
- [ ] Resumable, accessible, truthful frontend states pass tests.
- [ ] End-to-end sandbox flow and failure injection pass.
