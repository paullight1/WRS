# Phase 2.2 — Code Quality Tooling

## Goal
Make syntax, style, typing and configuration errors detectable before deployment.

## Implementation
- Add ESLint with React/hooks/accessibility-aware rules.
- Add Prettier or an equivalent deterministic formatter.
- Begin TypeScript migration with strict configuration; prioritize domain/service boundaries and new production code.
- Add `typecheck`, `lint`, `format:check` and dependency-audit scripts.
- Validate required environment variables through one typed schema.
- Define an incremental policy for legacy JS so the migration does not become a repo-wide blocker.

## Tests / Evidence
- `npm run lint`, `npm run typecheck`, `npm run format:check` and `npm run build` execute locally/CI.
- New code cannot introduce implicit production configuration.
- Baseline violations are documented separately from regressions.

## Exit gate
All new production work is automatically checked for lint, formatting, typing and environment-contract errors.