# Engineering Baseline

WRS uses an incremental production-hardening policy. Existing legacy JSX screens predate lint/typecheck coverage and are not silently declared clean. Instead, **new production code** in `src/domain`, `src/services`, `src/infrastructure`, and the Plan 1 safety layer in `src/lib` is linted, formatted, tested, and—where TypeScript—strictly typechecked.

When a later plan materially edits a legacy screen, regressions in the touched path must be fixed and tested; unrelated historical style debt must not be mixed into that feature PR. This keeps the gate meaningful rather than weakening rules to make a large baseline look green.

Required commands are `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run test:contracts`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run build`, and `npm run audit`.

Production evidence means fresh CI output from a clean checkout. A toast, route transition, mock value, local assumption, or previous run is never sufficient evidence.
