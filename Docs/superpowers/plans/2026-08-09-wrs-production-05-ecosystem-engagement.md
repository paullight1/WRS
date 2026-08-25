# WRS Production Track 5: Marketplace, Academy, Community, and Engagement

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Ten agents may work in parallel in isolated branches, then integrate through documented APIs and role policies.

**Goal:** Replace UI-only ecosystem features with production services for marketplace skills, data marketplace registry, academy, community, referrals, notifications, support, and public catalogue experiences.

**Architecture:** Each product area owns its catalogue and lifecycle but shares identity, entitlement, moderation, notification, audit, and financial interfaces from the other tracks. Public content is publishable and cacheable; member activity is authenticated and server-owned. Community and referral systems require abuse controls and human operations from day one.

**Tech Stack:** React 18/Vite, Node.js API, PostgreSQL, object storage for approved assets, search/indexing where needed, notification provider, support/ticket provider, moderation queue, CI/CD.

## Global Constraints

- A catalogue item is not installable, purchasable, accredited, or available until its backend lifecycle says so.
- Marketplace installation must enforce entitlement, licensing, compatibility, malware scanning, and rollback.
- Academy completion and certificates require server evidence and versioned assessments.
- Community content is moderated, reportable, removable, and subject to retention and safeguarding rules.
- Referral rewards require a real qualifying event and anti-self-referral/fraud controls.
- Notifications and support messages must be durable, privacy-aware, retry-safe, and auditable.
- Static mock data may support design previews but cannot create user achievements, social proof, rewards, or operational claims.

## Current Baseline

- Marketplace UI: `src/screens/Marketplace.jsx`
- Academy UI: `src/screens/Academy.jsx`
- Community UI: `src/screens/Community.jsx`
- Referrals UI: `src/screens/Referrals.jsx`
- Notifications UI: `src/screens/Notifications.jsx`
- Support UI: `src/screens/Support.jsx`
- Public catalogue: `src/screens/Landing.jsx`, `Packages.jsx`, `PackageDetail.jsx`
- Current behavior: these areas are mostly catalogue/presentation or explicitly unavailable; there are no production service backends for their core actions.

## Parallel Execution Model

Agents 1–10 work in isolated branches. Agent 1 owns shared catalogue conventions; Agent 8 owns notification event contracts; Agent 9 owns moderation/support roles. Agents must not invent payment, entitlement, identity, or reward rules; they consume the shared interfaces from Tracks 1 and 4. Integration begins with catalogue schemas, then lifecycle APIs, then frontend, then abuse and operational testing.

## Agent Workstreams

### Agent 1 — Shared catalogue and publishing platform

**Own:** `server/catalogue/`, catalogue migrations, publishing workflow, public API conventions, catalogue tests.

**Deliver:** versioned items; draft/review/published/retired states; ownership; localization; moderation status; effective dates; cache invalidation; public/private projections.

**Required tests:** drafts are not public; retired items remain in historical records; only authorized publishers can publish; cache does not expose private metadata; version is pinned to transactions or completions.

**Acceptance:** Marketplace, academy, and public packages use consistent server-owned catalogue lifecycle semantics.

### Agent 2 — Skill marketplace catalogue and licensing

**Own:** `server/marketplace/`, marketplace schema/routes, `Marketplace.jsx`.

**Deliver:** skill metadata; compatibility requirements; package entitlement; license terms; price snapshot; install/update/uninstall lifecycle; vendor ownership; dependency graph.

**Required tests:** incompatible skill cannot install; unlicensed user cannot download; retired skill cannot be newly installed; dependency failure rolls back; vendor cannot modify purchased history.

**Acceptance:** Marketplace actions produce real server states and never show installed/updated until the installation transaction is confirmed.

### Agent 3 — Skill package security and runtime isolation

**Own:** artifact storage/scanning, signature verification, sandbox/runtime policy, marketplace security tests.

**Deliver:** signed artifacts; malware/dependency scanning; provenance/SBOM; permission manifest; sandbox execution; rollback; vendor key rotation; kill switch.

**Required tests:** unsigned artifact blocked; malicious fixture quarantined; excessive permission denied; revoked vendor key blocks update; rollback restores prior known-good version.

**Acceptance:** No marketplace artifact can execute with implicit access to user data, wallet, identity, or robot controls.

### Agent 4 — Data marketplace registry and release controls

**Own:** `server/dataMarketplace/`, dataset registry, provenance/release checks, public/private dataset views.

**Deliver:** dataset metadata; consent/rights coverage; quality summary; license; lineage; buyer access request; release approval; delivery record.

**Required tests:** dataset with missing consent coverage cannot publish; buyer cannot access without approval; revoked contribution blocks release; delivery is auditable; private metadata is hidden.

**Acceptance:** Dataset marketplace is a controlled registry, not an unverified download catalogue.

### Agent 5 — Academy courses, progress, and certificates

**Own:** `server/academy/`, course migrations/routes, `Academy.jsx`, certificate service.

**Deliver:** course/module versioning; enrollment; progress; assessments; instructor role; completion evidence; certificate issuance/revocation; accessibility metadata.

**Required tests:** progress is owner-scoped; completion requires assessment evidence; certificate is unique and verifiable; revoked course version cannot rewrite history; instructor cannot self-award without policy.

**Acceptance:** Academy completion is server-backed and certificate claims can be independently verified.

### Agent 6 — Community events, groups, and moderation

**Own:** `server/community/`, community routes, `Community.jsx`, moderation queue and policy.

**Deliver:** groups; events; attendance; announcements; posts/comments; reporting; moderation states; bans; appeals; safeguarding escalation.

**Required tests:** banned user cannot post; report creates a review item; moderator permissions are scoped; deleted content is retained only per policy; event attendance cannot fabricate rewards.

**Acceptance:** Community has clear rules, abuse response, auditability, and durable server state before public launch.

### Agent 7 — Referral qualification and fraud controls

**Own:** `server/referrals/`, referral routes, `Referrals.jsx`, fraud rules.

**Deliver:** referral code ownership; attribution window; qualifying event; anti-self-referral; device/payment/account signals; caps; holds; reward event integration; dispute handling.

**Required tests:** self-referral fails; duplicate device/payment/account patterns are held; reward cannot occur before qualification; cancellation reverses reward; caps hold under concurrency.

**Acceptance:** No referral reward is based on registration alone or on a client-provided completion claim.

### Agent 8 — Notifications and preference delivery

**Own:** `server/notifications/`, outbox/event consumers, providers, `Notifications.jsx`, settings integration.

**Deliver:** in-app inbox; email/SMS/push adapters; templates; localization; preference/consent checks; deduplication; retry/dead-letter; read state; transactional versus marketing classification.

**Required tests:** duplicate event sends one notification; revoked channel consent blocks marketing; transactional notification follows policy; provider outage retries safely; notification content does not leak sensitive data.

**Acceptance:** Every notification has a source event, delivery state, privacy classification, and user preference decision.

### Agent 9 — Support operations and customer service

**Own:** `server/support/`, ticket routes, provider adapter, `Support.jsx`, operator runbook.

**Deliver:** ticket creation; authenticated identity binding; category/priority; attachments through private storage; SLA state; assignment; replies; escalation; closure; satisfaction feedback.

**Required tests:** anonymous ticket cannot access private account data; attachment scanning runs; user sees only their tickets; operator permissions are scoped; duplicate retry does not create duplicate ticket.

**Acceptance:** “Support request submitted” appears only after a durable ticket ID exists and failure states preserve the user’s draft safely.

### Agent 10 — Ecosystem frontend, public content, and release audit

**Own:** `Marketplace.jsx`, `Academy.jsx`, `Community.jsx`, `Referrals.jsx`, `Notifications.jsx`, `Support.jsx`, `Landing.jsx`, `Packages.jsx`, integration tests.

**Deliver:** server-driven screens; loading/error/empty states; accessible actions; moderation and provider status; public catalogue cache; removal of factual static mock claims; end-to-end tests.

**Required tests:** each action maps to a confirmed API response; static fixture data cannot create state; permission denial is clear; public/private boundaries hold; notification/support retry is idempotent.

**Acceptance:** All ecosystem screens are either fully operational or explicitly labelled unavailable; no UI implies community activity, certificate, referral reward, installed skill, support ticket, or notification that the server did not create.

## Track Release Gate

- [ ] Catalogue publishing, versioning, and retirement work.
- [ ] Marketplace licensing, scanning, compatibility, installation, and rollback work.
- [ ] Data marketplace rights and release checks work.
- [ ] Academy progress and verifiable certificates work.
- [ ] Community moderation, reporting, appeals, and safeguarding work.
- [ ] Referral qualification and fraud controls work.
- [ ] Notifications are durable, preference-aware, and retry-safe.
- [ ] Support tickets, attachments, assignment, and escalation work.
- [ ] Frontend integration tests prove no static mock creates factual user state.
