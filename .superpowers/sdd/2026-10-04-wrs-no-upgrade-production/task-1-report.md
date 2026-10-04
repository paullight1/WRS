# Task 1 implementation report

Status: implementation and local validation complete; the pull-request-triggered GitHub run remains pending under the coordinator's explicit publishing restriction.

## Implementation

- Generalized `scripts/plan11/supabase-live-audit.mjs` to require all five `WRS_SUPABASE_AUDIT_*` inputs and a declared `staging` or `production` target. Fixed map: staging `bymiojfdlkspawvakrif`; production `zaujrbcvgargyabebjyj`.
- Bound the HTTPS hostname and database connection to that mapped ref. Database support is intentionally limited to canonical direct host `db.<expected-ref>.supabase.co` with `postgres`, or one-label Supabase pooler host `<pooler>.pooler.supabase.com` with exact `postgres.<expected-ref>` username. Requires a password and `/postgres`. Only `sslmode` and positive `connect_timeout` URI options are supported, with no duplicate options; libpq overrides such as `host`, `user`, `dbname`, `service`, `options`, and fragments are rejected. This extra DB binding was explicitly confirmed by the coordinator after self-review found the legacy identity gap.
- Sorted repository filenames, extracted suffix names, and compared the exact applied migration name set. Applied timestamps are read as metadata but never determine parity. Missing, unexpected, duplicate, or unnamed migrations fail closed. Invalid local filenames and duplicate suffix names also fail closed.
- Kept PostgreSQL 17, pgcrypto, nine critical table RLS checks, private `wrs-private-data`, positive size limit at or below 50 MiB, and required MIME entries as audit contracts. Missing critical rows fail closed independently of the SQL-derived RLS summary.
- Wrapped the metadata query in an explicit read-only transaction followed by rollback. Credentials stay in the database process environment; raw database stderr and upstream Auth failures are never printed. Auth uses a 30-second timeout and rejects redirects.
- Output includes target/ref, both migration name arrays/counts, PostgreSQL version, Auth health, critical table/RLS state, and private bucket configuration. Output is `PROBE_PASS` with an explicit statement that it grants no Plan 11 or human approval PASS. It emits no credentials or application row data.
- Database CI discovers all `supabase/migrations/*.sql`, sorts with the C locale, rejects zero files, increments only after successful application, and asserts successful count equals discovered count. Removed hard-coded `25`.
- Live activation workflow selects exactly one `staging` or `production` GitHub environment per manual audit, reads target-neutral scoped variables/secrets, and names the artifact with its target. Actual GitHub environment protections must already be configured externally; this source change does not claim they exist.

## Owned files

1. `.github/workflows/plan11-database-gate.yml`
2. `.github/workflows/plan11-live-activation-gate.yml`
3. `scripts/plan11/supabase-live-audit.mjs`
4. `tests/plan11/supabaseLiveInfrastructureContract.test.mjs`
5. `tests/plan11/liveMigrationSetContract.test.mjs`
6. This report.

No migrations, user application files, existing readiness documents, or other pre-existing changes were staged or changed by Task 1. No subagents/reviewers were dispatched.

## TDD RED/GREEN evidence

Focused command used throughout:

```sh
node --test tests/plan11/supabaseLiveInfrastructureContract.test.mjs tests/plan11/liveMigrationSetContract.test.mjs
```

Initial RED: eight tests, zero passes, eight failures. Migration behavior imports hit the legacy top-level `WRS_SUPABASE_STAGING_PROJECT_REF is invalid` error because the old script could not be imported with the declared-target contract. The workflow contracts separately failed on hard-coded `test "${count}" -eq 25` and missing `supabase_audit_target`. These failures confirmed the staging-only environment contract and stale count before implementation. The initial raw output is in `/tmp/wrs-task1-red.log`.

Initial GREEN: eight tests passed after generalization.

Self-review RED: adding canonical DB ref and pooler username binding tests produced nine tests, eight passes, one failure (`Missing expected exception`). Raw output: `/tmp/wrs-task1-db-red.log`. GREEN: nine passes after binding the connection identity.

Further RED: adding libpq `host`, `user`, and `service` URI override cases again produced nine tests, eight passes, one failure (`Missing expected exception`). Raw output: `/tmp/wrs-task1-uri-red.log`. GREEN: nine passes after restricting safe URI options.

Final focused output (`/tmp/wrs-task1-green.log`):

```text
repository migrations use sorted filenames and suffix names: PASS
remote names match repository suffixes regardless of applied timestamps or row order: PASS
missing, unexpected, duplicate and unnamed remote migrations are rejected: PASS
database CI applies every discovered SQL file and asserts its discovered count: PASS
audit requires an explicit known target and matching project identity: PASS
database connection is bound to the declared project for canonical direct and pooler URLs: PASS
infrastructure rejects missing RLS, tables, bad Postgres and misconfigured private buckets: PASS
Auth failures fail closed before database probe; output includes audit names and no credentials or row data: PASS
Supabase live audit is manual and scoped to one declared protected environment: PASS
tests 9; pass 9; fail 0; skipped 0
```

Database CI loop contract executes the workflow's actual shell body against synthetic directories containing 0, 1, 3, and 35 SQL files. Empty discovery fails; every nonempty case applies exactly the discovered count.

Broader existing contracts:

```sh
node --test tests/plan11/*.test.mjs
```

Final result: 62 tests, 62 passed, zero failed/skipped (`/tmp/wrs-task1-all-plan11.log`). `git diff --check` also passed.

## PostgreSQL 17 database gate equivalent

Pulled the workflow's `postgres:17` Docker image and created an isolated container `wrs-task1-pg17-20261004` with a synthetic password/database, exposing only an ephemeral loopback port. Extracted the exact three workflow shell bodies (bootstrap, migration application, verification) into `/tmp/wrs-task1-database-gate.sh` and ran them unchanged with local PG environment variables.

Result (`/tmp/wrs-task1-database-gate.log`):

```text
DATABASE_GATE_EXIT_CODE=0
POSTGRES_VERSION=17.11 (Debian 17.11-1.pgdg13+2)
Applied 34/34 repository migrations
plan11_post_migration_checks.sql: completed, verification PASS
plan11_payment_checks.sql: completed, verification PASS
plan11_data_checks.sql: completed, verification PASS
plan11_operational_health.sql: completed, verification PASS
plan11_recovery_fingerprint.sql: completed, synthetic zero-data fingerprint returned
plan11_final_go_checks.sql: completed, database SQL assertions PASS
```

These SQL notices describe local synthetic database assertions only. They are not evidence granting the live final GO gate or any human owner approval.

Also created local synthetic `supabase_migrations.schema_migrations` metadata with all 34 suffix names, reversed order and unrelated connector-style timestamps, then executed the audit's exact read-only SQL on PostgreSQL 17.11 and passed its real JSON through `validateInfrastructure`:

```text
REAL_AUDIT_SQL_PASS: PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2); applied migration names=34; critical tables=9; bucket public=False
REAL_INFRASTRUCTURE_VALIDATION_PASS: repository=34; applied=34; differently assigned timestamps accepted by exact names
```

The temporary container was removed after verification. No remote Supabase connection, migration, data change, organization upgrade, new organization/project, or production change occurred.

## Self-review and concerns

- Reviewed the full owned diff and confirmed exact target refs, safe output fields, exact migration parity, read-only metadata query, missing-table/RLS rejection, bucket checks, Auth failure ordering, and dynamic migration discovery. Detected and fixed DB target ambiguity plus libpq URI identity overrides using additional RED/GREEN cycles.
- The brief's Step 6 PR-triggered GitHub execution is pending. Coordinator clarification: “Do not create or push a PR. The current branch contains user work and publishing is outside this task.” Local PostgreSQL validation was the authorized substitute. No PR was created or pushed.
- Worktree has 34 SQL migrations, of which six are pre-existing untracked files. Task 1 did not stage those files. A published checkout may contain only 28 until their owner integrates them; the CI gate correctly derives whichever repository set is present. The 34-migration local result applies to this worktree's current files.
- Remote project migration parity, live Auth, GitHub environment protections, and scoped audit secrets are not validated by local fixtures. Those remain later reconciliation/configuration work. No Plan 11 evidence status was changed by this task.
- The audit accepts canonical Supabase connection forms only, as documented above. Nonstandard tunnels, custom DB names/users, and arbitrary URI options require a deliberate reviewed extension.
- The MIME contract preserves the existing requirement to contain every required MIME entry, rather than introducing a new exact allowlist policy.
- Supabase skill documentation was consulted: `https://supabase.com/changelog.md`, current database migrations guide, CLI migration reference, and the September 25 PostgreSQL 15.19/17.11 changelog. No audit-contract change was needed for those minor-release migration notes.

## Review round 1 fix report

Finding: Important — the Supabase audit was piped into `tee` without explicit pipefail. An unspecified GitHub Bash shell could return the successful `tee` exit status when the Node audit failed, incorrectly passing the job.

Fix: `.github/workflows/plan11-live-activation-gate.yml` now declares `shell: bash` on the Supabase audit step and runs a multiline script beginning with `set -euo pipefail`. This explicitly propagates the failing pipeline command's exit status. The artifact command and its target-specific name remain as implemented in Task 1.

Regression contract: `tests/plan11/supabaseLiveInfrastructureContract.test.mjs` extracts the actual Supabase audit step's shell body, substitutes a synthetic Node executable, and runs the pipeline under plain Bash without runner-supplied safety flags. It proves an audit exit status of 17 survives the successful real `tee`, and that an audit exit status of 0 still succeeds and saves stdout. It also asserts the workflow selects Bash explicitly. Temporary fixtures are removed by the test.

TDD covering command:

```sh
node --test --test-name-pattern='audit failure cannot be masked by tee' tests/plan11/supabaseLiveInfrastructureContract.test.mjs
```

RED output (`/tmp/wrs-task1-review1-red.log`):

```text
Supabase workflow audit failure cannot be masked by tee: FAIL
AssertionError: audit exit 17 was masked by tee:
0 !== 17
tests 1; pass 0; fail 1
```

GREEN output (`/tmp/wrs-task1-review1-green.log`):

```text
Supabase workflow audit failure cannot be masked by tee: PASS
tests 1; pass 1; fail 0; skipped 0
```

Focused regression command:

```sh
node --test tests/plan11/supabaseLiveInfrastructureContract.test.mjs tests/plan11/liveMigrationSetContract.test.mjs
```

Output (`/tmp/wrs-task1-review1-focused.log`): `tests 10; pass 10; fail 0; skipped 0`. `git diff --check` also passed.

Self-review: confirmed that both the workflow command body and explicit shell carry the failure handling, that the regression runs the extracted command rather than a separate illustrative pipeline, and that the successful path still saves stdout. Only the live workflow, its owned contract test, and this report changed. No PR was published, no remote probe was run, and no unrelated changes were staged. The previously reported PR-triggered and live-configuration checks remain pending.
