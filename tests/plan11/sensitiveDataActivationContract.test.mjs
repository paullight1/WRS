import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('sensitive-data activation uses a synthetic two-stage staging drill through real WRS APIs', () => {
  const source = fs.readFileSync('scripts/plan11/sensitive-data-staging-drill.mjs', 'utf8')
  for (const marker of [
    '/api/auth/login',
    '/api/data/consent',
    '/api/data/upload-grant',
    '/api/data/upload-complete',
    '/api/data/scan',
    '/api/data/delete',
    '/api/data/delete/process',
    'WRS_STAGING_TEST_EMAIL',
    'WRS_STAGING_TEST_PASSWORD',
    'WRS_DATA_SCANNER_SECRET',
    'WRS_DATA_DELETION_SECRET',
    'synthetic',
    'prepare',
    'finalize',
  ]) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(source, /scanStatus.*pending/s)
  assert.match(source, /scanStatus.*clean/s)
  assert.match(source, /earliestFinalizationSeconds/)
})

test('sensitive-data drill is manual, secret-scoped and never runs on ordinary PR events', () => {
  const workflow = fs.readFileSync('.github/workflows/plan11-live-activation-gate.yml', 'utf8')
  assert.match(workflow, /run_sensitive_data_drill/)
  assert.match(workflow, /sensitive-data-staging/)
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/)
  assert.match(workflow, /WRS_STAGING_TEST_EMAIL/)
  assert.match(workflow, /WRS_STAGING_TEST_PASSWORD/)
  assert.match(workflow, /WRS_DATA_SCANNER_SECRET/)
  assert.match(workflow, /WRS_DATA_DELETION_SECRET/)
  assert.match(workflow, /plan11-sensitive-data/)
})
