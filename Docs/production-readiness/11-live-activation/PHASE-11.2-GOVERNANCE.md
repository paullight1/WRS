# Phase 11.2 — Repository Governance

## Goal

Make production promotion reviewable and fail closed so passing code cannot bypass release governance.

## Repository controls implemented

- Added `.github/CODEOWNERS` for the full repository and explicit high-risk API/server/Supabase/workflow/release surfaces.
- Added `Docs/releases/PRODUCTION_RELEASE_CHECKLIST.md` with the exact mandatory CI/database/security/recovery checks and live evidence required for promotion.
- Kept Plan 11 on a dedicated draft PR based on the certified Plans 5–10 head.
- Required an independent/second reviewer for a production release decision in the documented release process.
- Kept rollback criteria, release owner, rollback owner and incident ownership as explicit prerequisites to GO.

## Review and improvement

Repository inspection shows `main`/the Plan 11 branch does **not** currently have GitHub branch protection enforced. CODEOWNERS and workflows document/enforce review expectations inside the repository, but they cannot by themselves stop an administrator from direct-pushing or merging without required checks.

The desired GitHub rule for `main` is:

1. require pull requests before merging;
2. require at least one independent approval;
3. dismiss stale approvals after release-critical changes;
4. require review-conversation resolution;
5. require the WRS Quality Gate, Plan 10 Security/Launch, Plan 10 Recovery and all applicable database gates;
6. block force pushes and deletion;
7. prevent direct pushes, including normal release work;
8. apply the rule to administrators unless a documented emergency/break-glass process is being used.

## Classification

**REPOSITORY POLICY READY / EXTERNAL BLOCKER.**

The code ownership and release policy are complete in Git. Actual GitHub branch-protection/ruleset enforcement is a platform setting and remains `EXTERNAL BLOCKER` until it is enabled and evidenced on `main`.

The activation loop may continue to later phases because this phase now has a complete repository-side implementation and an explicit fail-closed external gate. Final GO remains impossible while branch protection is not evidenced.
