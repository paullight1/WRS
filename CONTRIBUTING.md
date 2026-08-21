# Contributing to WRS

New business rules belong in `src/domain`, orchestration in `src/services`, and provider-specific code in `src/infrastructure`. UI code must not become authoritative for sensitive state.

Tests go in `tests/unit`, `tests/integration`, or `tests/e2e`; production-readiness contract tests remain under `tests/plan*`. New behavior follows RED → GREEN → REFACTOR: first prove the test fails for the intended reason, implement the smallest correct change, then rerun the full affected gate.

Before marking work complete, run the production evidence commands: lint, typecheck, format check, contract tests, unit/integration tests, browser E2E, build, and dependency audit. CI evidence from a clean checkout is required before a phase or plan is classified production-ready.
