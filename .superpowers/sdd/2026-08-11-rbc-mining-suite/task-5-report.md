# Task 5 — Admin mining control plane report

## Status

DONE_WITH_CONCERNS

## Delivered

- Added `src/lib/adminMiningApi.js`, a thin authenticated client for the deployed admin mining endpoints. All mutations include a fresh idempotency key.
- Added `src/components/admin/ConversionRateEditor.jsx` for rate drafts, explicit publish confirmation, source notes, published/effective timestamps, and immutable version history. The editor reflects the implemented lifecycle: publishing a replacement automatically retires the previous published rate.
- Added `src/components/admin/WithdrawalReviewTable.jsx` with status filtering and explicit approve, reject, and “record external payout” actions. It only renders the server-provided masked bank projection and never claims WRS initiated a bank transfer.
- Added `src/screens/admin/MiningAdmin.jsx`, consumed by the existing guarded `/admin/mining` route. It loads the actual overview, conversion-rate, withdrawal, and audit endpoints; handles API `403` as a restricted control-plane state; and renders actor, role, request ID, review/rejection data, payout reference, timestamps, and masked audit account details.
- Added `scripts/admin-mining.test.js` with focused behavior coverage for member denial propagation, the actual rate draft/publish contract, explicit withdrawal actions, required rejection/payout evidence, and deployed audit-event shape rendering.

## API contract reconciliation

The UI was checked against the current Task 1 implementation rather than only the initial design brief:

- `POST /admin/mining/conversion-rates` receives `{ currency, rateMinorPerRbcCent, sourceNote }`.
- `POST /admin/mining/conversion-rates/:id/publish` receives an empty body; the client confirmation is intentionally local UI safety.
- Publishing automatically retires the prior published version for the same currency. There is no standalone retire endpoint, so the UI shows retired versions rather than issuing a nonexistent request.
- Withdrawal records use `amountRbcCents`, `currency`, and masked `bank` fields. Review actions use the documented approve/reject/mark-paid endpoints.
- Audit events contain `actorUserId`, `actorRoles`, `before`/`after`, `requestId`, and `createdAt`; the UI reads only masked data from the public `after` snapshot.

## Verification

- Red phase observed: `node --test scripts/admin-mining.test.js` initially failed because `src/lib/adminMiningApi.js` did not exist.
- Green phase: `node --test scripts/admin-mining.test.js` — 5/5 passing.
- JSX compilation: `esbuild src/screens/admin/MiningAdmin.jsx --bundle --format=esm --jsx=automatic` — passed.
- Production build: `npm run build` — passed and emitted the guarded `MiningAdmin` chunk.
- API compatibility check: `node --test server/tests/rbc.test.js` ran 5 tests; 4 passed and 1 failed outside this task’s owned files.

## Concern for integration

`server/rbc.js` currently records every audit event with `targetType: 'withdrawal'`, including `conversion_rate.published`. The backend focused test expects conversion-rate events to use `targetType: 'conversion_rate'`, so `server/tests/rbc.test.js` has one failing assertion. This task did not modify server code by instruction. The client remains compatible with the event payload, but Task 1/integration should correct that audit target type before release.
