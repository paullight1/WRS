# Admin Reward Control and Production Readiness Design

## Intent and success criteria

WRS needs an authorized administrator to control XP and RoboCoin reward policy from the existing Operations area, while keeping financial issuance off until an operator deliberately configures and enables it. The same change should move the repository as far as possible through its existing production-readiness process and clearly preserve any gates that need real provider, staging, or human evidence.

Success means:

- An administrator can grant and revoke scoped operator roles through an audited, server-authorized workflow.
- A trusted one-time bootstrap can establish the first full administrator without permitting a member to elevate their own account.
- Reward operators can save immutable policy drafts, activate XP independently, and enable or pause RBC only after explicitly supplying valid economics and issuance limits.
- No example monetary values are silently saved, activated, or presented as an approved policy.
- Mining issuance remains disabled by default and is not activated by this work.
- The production-readiness result is evidence-based and fail-closed; unresolved external blockers remain visible as NO-GO.

## Current state

- `AdminOperationsProduction.jsx` already exposes a rewards scope to `admin` and `reward_operator` roles.
- `api/admin/operations.js` and `api/admin/action.js` enforce `operations.rewards`; sensitive reward actions require recent MFA and are recorded through the existing operations audit path.
- `RewardRulesEditor.jsx` already saves versioned drafts and exposes distinct XP activation and RBC issuance controls. Its current form pre-fills example RBC rates and caps, which risks making sample economics look approved.
- `public.user_roles` is the active role assignment table. It records grant time and issuer but does not provide a purpose-built admin grant/revoke workflow or a durable revocation history.
- Reward issuance is intentionally disabled in the database until an active rule has valid precision, rate, and issuance caps.
- Plan 11 is already the repository's fail-closed live readiness process. Its evidence matrix is NO-GO and identifies unresolved infrastructure, governance, payment, privacy, operations, staging, recovery, legal, and owner evidence. Its recorded candidate also differs from the active checkout.

## Scope and assumptions

Included:

1. Audited administration of scoped staff/operator roles, including reward operators.
2. A one-time, trusted bootstrap path for the first `admin` role.
3. Explicit draft/activation behavior for reward economics in the existing Rewards Operations screen.
4. Repository-side Plan 11 readiness work and an accurate refreshed NO-GO/evidence report.

The current app `admin` role remains the authority to manage scoped operator roles. The UI will not grant or revoke the full `admin` role. Initial admin assignment uses the one-time bootstrap; subsequent full-admin changes stay with the trusted project-owner procedure and are outside this UI. A role holder cannot grant or revoke roles for their own account. Removing the last active administrator is rejected.

This work does not choose or approve reward amounts, enable production issuance, run a production migration, deploy/promote a release, claim legal approval, or fabricate external evidence. The active development account/project must be confirmed before any real environment mutation. Plan 11 continues to determine GO/NO-GO independently of repository checks.

## Design

### 1. Role administration and bootstrap

Add an admin-only Operations area for scoped staff roles, initially focused on roles already understood by the operations permission model: support, KYC, finance, data, deployment, risk, and rewards. Find a target by exact account email or UUID, then show that account's current scoped roles and allow an administrator to grant or revoke one with a required reason. Search results disclose only the minimum account identifier and role data needed for this action. Every attempt that reaches the server is authorized there; hiding the UI is not the security boundary.

Persist current grants in `user_roles` and add an append-only role-assignment audit record for completed grant and revoke events, including subject, role, actor identity/type, reason, and timestamp. Use a service-role RPC/transaction after validating the authenticated admin session, recent MFA, same-origin request, and role-management permission. Prevent self-assignment, self-revocation, granting `admin` from this UI, and revoking the final active `admin`. Revoke must remove effective permission immediately while retaining history in the audit record. Existing service-only role reads and client write restrictions remain in force.

Provide a separate one-time bootstrap procedure that accepts an explicitly supplied existing user UUID and targets a specifically configured Supabase project. It must refuse to run when an administrator already exists, never infer a user from the current browser session, avoid printing secrets, and write the same audit record with a bootstrap actor identity/type and reason. This procedure establishes only the initial full `admin`; it does not set reward policy or enable issuance. Subsequent full-admin grants or removals use a separately authorized project-owner procedure, never the browser UI.

### 2. Reward policy lifecycle

Keep the existing Rewards Operations page and server action/RPC path. Remove hard-coded RBC economics from initial form state and remove copy that states example amounts as if they were the effective policy. Present empty economics fields until the administrator enters amounts and caps. Keep activity and miner-level presets only where they are non-monetary examples and clearly identify unsaved defaults as examples.

The lifecycle remains explicit:

1. Save an immutable draft with a required reason.
2. Activate a selected rule for XP.
3. Separately enable RBC for that rule only after all required monetary fields are explicitly supplied and server validation passes.
4. Allow an authorized operator to pause RBC without deleting history or changing old ledger entries.

Server/database rules remain authoritative for permission, recent-MFA evidence, positive precision/rate, per-session cap, per-user daily cap, global issuance cap, atomic precision, and append-only history. The UI must not imply that saving a draft or activating XP enables RBC. With no configured/active policy, mining remains unavailable and RBC issuance remains off.

### 3. Production readiness

Use the existing Plan 11 workflow and evidence matrix as the only live GO/NO-GO authority. First reconcile the active release candidate with the current runtime code and determine whether existing evidence is stale. Then perform repository-only readiness work that can be supported by the checkout, and run the existing readiness evaluator to report actual blockers. Do not change an external gate to PASS without its required evidence, owner, environment, and timestamp.

Refresh the candidate/evidence references only after the relevant code and evidence are consistent. Keep the decision NO-GO while any external blocker, missing human sign-off, or candidate mismatch remains. Infrastructure creation, provider credential setup, production promotion, real reward activation, legal decisions, and attestations remain outside this implementation and require their actual owners/environments.

## Data flow and security boundaries

- Browser admin screen → authenticated same-origin admin API → server-side session/permission/MFA checks → service-role database RPC.
- Role grants/revocations update effective role state transactionally with append-only audit history.
- Reward draft/activation calls continue through the current Operations API into guarded mining/reward RPCs; client data is never authoritative for issuance.
- The bootstrap procedure uses a trusted database-owner/service-role context and an explicit project/user target. No browser member token can invoke it.
- Plan 11 evidence is gathered from the exact release candidate and real external systems. The evidence evaluator remains fail-closed.

## Failure behavior

- Missing/expired MFA, missing permission, same-origin failure, invalid role, blank reason, self-change, full-admin grant through the UI, and last-admin removal are rejected server-side and do not mutate role state.
- A failed grant/revoke transaction leaves effective roles and success-audit records consistent; successful events retain actor, subject, reason, and timestamp.
- Missing or partial RBC economics prevent RBC enablement; invalid values are rejected by both UI validation and existing database validation.
- Provider/environment outages or incomplete Plan 11 evidence remain blockers; they never degrade into inferred PASS states.

## Verification and acceptance

Implementation verification will cover:

- Server denial for unauthenticated users, non-admins, stale MFA, self-grants, unsupported roles, empty reasons, full-admin UI assignment, and last-admin removal.
- Successful grant/revoke behavior, durable audit details, and immediate loss of effective permission after revocation.
- Empty initial RBC economics, explicit draft creation, independent XP activation, RBC enablement only with complete valid economics, and pause behavior.
- Database privilege/RLS boundaries and bootstrap refusal when an admin already exists or the target user/project is absent or ambiguous.
- Existing unit/contract/build checks appropriate to changed code, plus the Plan 11 readiness evaluator and evidence consistency check. Live external gates are marked PASS only after their real phase evidence exists.

## Non-goals

- Selecting a mining reward rate, member cap, or global supply policy.
- Issuing XP/RBC, converting historic points, or editing ledger history.
- Creating external Supabase/Vercel/GitHub/provider resources or using production credentials.
- Declaring the product production-ready solely because local checks pass.
- Reworking unrelated operations roles, financial ledger behavior, or the broader Plan 11 architecture.
