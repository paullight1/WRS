# Plan 11 Repository Activation Controls

This file records the repository-side controls used while live provider and human evidence is collected. It does not change the launch decision and does not substitute for any live gate in `EVIDENCE_MATRIX.json`.

- Application evidence is bound to frozen candidate `900068dda9802129ff312de828fd3735273af1db`.
- The Plan 11 evidence contract requires all 14 launch gates to be present and rejects unproven `PASS` states.
- Human gates require named approvals in addition to evidence references and timestamps.
- The release-candidate freeze rejects application/runtime drift after evidence collection begins; only Plan 11 evidence and explicitly scoped staging-test governance may change without selecting a new application candidate.
- Deployed staging probes require HTTPS, production browser security headers, no-store function liveness and a `/api/health` release identifier matching the frozen candidate.
- Deployed-only Playwright tests are excluded from ordinary local CI and run only when an external staging base URL is selected.
- Staging browser and lab-vitals evidence independently attest the candidate before results can be accepted.
- Paystack activation probing accepts test keys only; the runtime provider adapter pins production Paystack traffic to the official API origin.
- `plan11:status` may report a valid `NO_GO` state without failing CI. `plan11:gate` remains strict and cannot return `GO` until every required live gate has evidence-backed `PASS` status.
- PR #4 remains draft until the strict live gate succeeds and the controlled merge/promotion phase is authorized.
