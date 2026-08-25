import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('Phase 11.1 requires a versioned live environment manifest', async () => {
  const manifest = await text('.env.live.example')
  for (const key of [
    'VITE_WRS_MODE',
    'VITE_WRS_AUTHORITY_URL',
    'VITE_WRS_PAYMENT_SERVICE',
    'VITE_WRS_IDENTITY_SERVICE',
    'VITE_WRS_ROBOT_SERVICE',
    'VITE_WRS_DATA_SERVICE',
    'VITE_WRS_REWARD_SERVICE',
    'VITE_WRS_DEPLOYMENT_SERVICE',
    'VITE_WRS_SUPPORT_SERVICE',
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'PAYSTACK_SECRET_KEY',
    'WRS_DATA_SCANNER_SECRET',
    'WRS_DATA_REVIEW_SECRET',
    'WRS_DATA_DELETION_SECRET',
    'WRS_DEPLOYMENT_OPERATIONS_SECRET',
    'WRS_ECOSYSTEM_OPERATOR_TOKEN',
    'WRS_ACADEMY_ASSESSOR_TOKEN',
  ]) {
    assert.match(manifest, new RegExp(`^${key}=`, 'm'), `${key} must be documented`)
  }
})

test('Phase 11.1 preflight fails closed for incomplete production infrastructure', async () => {
  const source = await text('scripts/validate-live-env.mjs')
  assert.match(source, /VITE_WRS_MODE/)
  assert.match(source, /production/)
  assert.match(source, /staging/)
  assert.match(source, /SUPABASE_URL/)
  assert.match(source, /PAYSTACK_SECRET_KEY/)
  assert.match(source, /process\.exitCode\s*=\s*1|process\.exit\(1\)/)
  assert.match(source, /placeholder|example|localhost/i)
})

test('Phase 11.1 records connected-resource evidence and external blockers', async () => {
  const evidence = await text('Docs/production-readiness/11-live-activation/PHASE-11.1-INFRASTRUCTURE.md')
  assert.match(evidence, /Supabase/i)
  assert.match(evidence, /Vercel/i)
  assert.match(evidence, /EXTERNAL BLOCKER/)
  assert.match(evidence, /crescivacapital/)
  assert.match(evidence, /zero projects|0 projects/i)
})
