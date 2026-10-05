# Admin Reward Control — Readiness Report

**Reviewed:** 2026-10-03  
**Branch:** `paul/admin-reward-control`  
**Worktree:** `.worktrees/sep-21-1200eea`  
**Readiness decision:** **NO-GO for production**

## Delivered

- Added guarded, audited scoped role grants/revocations through the admin Operations panel. Access uses exact email/UUID lookup, recent MFA, a required reason, and excludes self-targets and the full-admin role.
- Connected reward controls to Rewards and Mining snapshots. RBC amounts start blank, issuance remains a separate guarded switch, and member pages show only server-confirmed policy values.
- Added server-confirmed daily login XP feedback on Home.
- Updated the Supabase migration guide to include the 34th SQL migration for role administration.
- Kept all deployment, database, and external provider actions untouched. No initial administrator was bootstrapped and RBC issuance was not enabled.

## Repository verification

| Check                              | Result                                                                                                                                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused role/reward tests          | Pass: 47 Vitest tests and 7 Node contract tests                                                                                                                                                            |
| Full unit suite                    | Pass: 119/119                                                                                                                                                                                              |
| Integration suite                  | Pass: 30/30                                                                                                                                                                                                |
| Plan contract suite                | Pass: 228/228                                                                                                                                                                                              |
| Typecheck                          | Pass                                                                                                                                                                                                       |
| Production build                   | Pass; Vite reports the main JS and robot-model chunks exceed its 500 KB advisory threshold                                                                                                                 |
| Lint and formatting                | Pass                                                                                                                                                                                                       |
| Secret scan                        | Pass                                                                                                                                                                                                       |
| Bundle budget                      | Pass: initial JS 502.42 KB / 575 KB; total JS 1329.44 KB / 1450 KB                                                                                                                                         |
| `npm audit --audit-level=moderate` | Fail: five high-severity transitive findings through Tailwind CSS 3 (`braces`, `chokidar`, `fast-glob`, `micromatch`). Audit's automatic all-fixes path requires Tailwind CSS 4, a breaking major upgrade. |
| `npm run plan11:status`            | NO_GO; 14 external blockers                                                                                                                                                                                |
| `npm run plan11:gate`              | NO_GO; expected exit code 1 while gates are blocked                                                                                                                                                        |

## Remaining release gates

Plan 11 still requires production-grade Supabase and Vercel infrastructure, GitHub branch protection, Paystack payment and payout drills, real scanning/deletion and alert routing, deployed staging and mobile performance evidence, manual accessibility and legal/privacy review, backup/restore and hosting rollback drills, and named launch owners.

The recorded staging check covers 33 migrations. The repository now contains 34; the new operator-role migration was not applied to Supabase and must be reconciled on the exact staging candidate. The initial admin bootstrap still requires an explicit existing user UUID and confirmed project reference.

The evidence matrix still names release candidate `07245b181e66e55634c2e2a08a2fd74c1b4af7a8`. The checkout is at `b3b04c940c811935d4e01a256ac2d6efad753683` with many pre-existing and current unstaged changes, so neither that historical hash nor the current `HEAD` attests this working tree. Keep the candidate hash unchanged until a reviewed commit/build is selected and its real deployment evidence is collected.

## Final review fixes

The independent code review found a role-mutation response that dropped rotated session cookies; the API now appends the returned cookies and a regression test covers it. The review also identified a displayed default training review decision that was omitted from the submitted payload; the UI now sends the visible default. XP activity and miner-level defaults are now explicitly labeled as unsaved examples. All three fixes were tested with failing-first regression checks.
