# WRS feature catalog

This catalog defines scope and sequencing. A feature listed here is not a promise that
it is commercially available; the UI must show `Prototype`, `Coming later`, `Eligible`,
or `Available` truthfully.

## Phase definitions

- **MVP — foundation:** prove the member loop with safe, manual operations.
- **Phase 2 — trusted network:** introduce human review, reputation, and local leaders.
- **Phase 3 — enterprise network:** introduce expert review, licensing, and enterprise
  operations after legal and commercial readiness.
- **Future — physical robotics:** activate real robot services only with device,
  insurance, safety, custody, and customer operating models.

## Capabilities

| ID  | Capability           | MVP                                                               | Phase 2                                 | Phase 3 / future                                  |
| --- | -------------------- | ----------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| IDN | Account and identity | Registration, email/phone verification, profile                   | risk-based identity checks, credentials | enterprise and jurisdiction-specific verification |
| RBT | Robot profile        | ID, passport, name, level, capabilities                           | reputation and career record            | verified physical-device link and service history |
| PKG | Access packages      | clear feature entitlements and limits                             | entitlement analytics                   | localized offerings subject to review             |
| TRN | Training center      | voice/language/text tasks, consent records                        | image/video/movement workflows          | specialist and physical-robot training            |
| DAT | Contributions        | task catalog, drafts, uploads, automated checks                   | review queues, appeals, quality scores  | commissioned projects and dataset releases        |
| VAL | Validator network    | staff/community moderation only                                   | Levels 1–2 and validator dashboard      | Levels 3–4, certification, release approval       |
| DEP | Deployment           | opportunity catalog and request flow; simulations clearly labeled | verified digital services               | contracted physical robot operations              |
| WAL | Wallet               | distinct XP, credits, pending and confirmed money views           | reward and payout reconciliation        | multi-currency/provider operations where licensed |
| RWD | Rewards              | XP, badges, event codes, abuse controls                           | trust-aware opportunities               | program-specific distributions                    |
| COM | Community            | announcements, events, groups, community rules                    | ambassadors and city leaders            | state/country/regional structure as demand proves |
| MKT | Skill marketplace    | catalog prototype                                                 | approved digital skills/tools           | developer ecosystem and revenue settlement        |
| DMP | Data marketplace     | internal dataset registry only                                    | buyer discovery and pilot contracts     | controlled enterprise licensing and delivery      |
| EDU | Academy              | course catalog, progress, completion                              | assessed certificates                   | external accreditation where applicable           |
| GOV | Governance           | policies, staff decision owners, audit log                        | councils in advisory capacity           | formal charters and delegated scopes              |
| ADM | Operations           | users, tasks, moderation, support, audit                          | validator/leader operations             | enterprise, release, and council operations       |

## Member-facing screen groups

The canonical mobile navigation remains **Home, My Robot, Deploy, Marketplace, More**.
Training, Data, Wallet, Rewards, Academy, Community, Referrals, Profile, Settings, and
Support live under More and may also appear as contextual dashboard actions.

Detailed navigation and labels are defined in [the navigation specification](../ia/NAVIGATION.md).

## Release gates

No phase may launch merely because its screens exist.

| Feature                | Minimum release gate                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Biometric contribution | specific consent, purpose/retention text, secure object storage, deletion workflow, access audit        |
| Human validation       | rubric, calibration set, blind review where appropriate, appeals, conflict rules, QA monitoring         |
| Monetary reward        | written eligibility, ledger event, reconciliation, tax/regulatory review, confirmed/pending distinction |
| Referral reward        | real qualification event, anti-self-referral controls, caps, fraud review, no recruitment-chain reward  |
| Leadership title       | published eligibility, safeguarding training, scoped permissions, term/review/removal process           |
| Dataset licensing      | provenance and consent coverage, rights review, privacy assessment, release approval, customer contract |
| Physical deployment    | verified device/control link, safety case, insurance, maintenance, operator and customer contract       |
