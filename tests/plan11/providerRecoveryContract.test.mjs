import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('provider restore evidence compares critical WRS state without printing source rows', () => {
  const source = fs.readFileSync('scripts/plan11/provider-restore-compare.mjs', 'utf8')
  for (const marker of [
    'WRS_RECOVERY_SOURCE_DB_URL',
    'WRS_RECOVERY_RESTORED_DB_URL',
    'WRS_STAGING_TEST_EMAIL',
    'postgres:17-alpine',
    'auth.users',
    'public.user_profiles',
    'public.robots',
    'public.package_entitlements',
    'public.consent_events',
    'public.data_assets',
    'public.ledger_transactions',
    'public.ledger_entries',
    'sourceFingerprint',
    'restoredFingerprint',
  ]) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(source, /sha256/i)
  assert.doesNotMatch(source, /console\.log\([^)]*DATABASE_URL/)
})

test('provider restore comparator is manual and uses separate source/restored database secrets', () => {
  const workflow = fs.readFileSync('.github/workflows/plan11-live-activation-gate.yml', 'utf8')
  assert.match(workflow, /run_provider_restore_compare/)
  assert.match(workflow, /provider-restore-integrity/)
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/)
  assert.match(workflow, /secrets\.WRS_RECOVERY_SOURCE_DB_URL/)
  assert.match(workflow, /secrets\.WRS_RECOVERY_RESTORED_DB_URL/)
  assert.match(workflow, /plan11-provider-restore-integrity/)
})
