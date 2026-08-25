import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('Phase 11.3 provides a fail-closed Paystack sandbox smoke script', async () => {
  const source = await text('scripts/paystack-sandbox-smoke.mjs')
  assert.match(source, /PAYSTACK_TEST_SECRET_KEY/)
  assert.match(source, /sk_test_/)
  assert.match(source, /transaction\/initialize/)
  assert.match(source, /WRS_STAGING_URL/)
  assert.match(source, /process\.exitCode\s*=\s*1|process\.exit\(1\)/)
  assert.doesNotMatch(source, /sk_live_/)
})

test('Phase 11.3 has a manual sandbox workflow with no production key fallback', async () => {
  const workflow = await text('.github/workflows/plan11-payment-sandbox.yml')
  assert.match(workflow, /workflow_dispatch/)
  assert.match(workflow, /PAYSTACK_TEST_SECRET_KEY/)
  assert.match(workflow, /WRS_STAGING_URL/)
  assert.match(workflow, /paystack-sandbox-smoke/)
  assert.doesNotMatch(workflow, /PAYSTACK_SECRET_KEY\s*:/)
})

test('Phase 11.3 includes read-only financial verification SQL', async () => {
  const sql = await text('supabase/verification/plan11_payment_checks.sql')
  assert.match(sql, /transaction read only/i)
  assert.match(sql, /ledger_transactions/)
  assert.match(sql, /ledger_entries/)
  assert.match(sql, /package_entitlements/)
  assert.match(sql, /payment_intents/)
  assert.match(sql, /withdrawals/)
  assert.match(sql, /verification PASS/)
})

test('Phase 11.3 payment transport uses shared timeout and telemetry controls', async () => {
  const provider = await text('api/_lib/paystack.js')
  assert.match(provider, /fetchWithTimeout/)
  assert.match(provider, /telemetryEvent/)
  assert.doesNotMatch(provider, /console\.error\(['"]Paystack transport error/)
})

test('Phase 11.3 records sandbox evidence requirements and remains fail closed', async () => {
  const phase = await text('Docs/production-readiness/11-live-activation/PHASE-11.3-PAYMENTS.md')
  assert.match(phase, /Paystack/i)
  assert.match(phase, /sandbox/i)
  assert.match(phase, /webhook/i)
  assert.match(phase, /reconciliation/i)
  assert.match(phase, /refund/i)
  assert.match(phase, /withdrawal/i)
  assert.match(phase, /EXTERNAL BLOCKER/)
})
