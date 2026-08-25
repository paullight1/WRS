import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
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
    'WRS_DATA_BUCKET',
    'WRS_DATA_SCANNER_SECRET',
    'WRS_DATA_REVIEW_SECRET',
    'WRS_DATA_DELETION_SECRET',
    'WRS_DEPLOYMENT_OPERATIONS_SECRET',
    'WRS_ECOSYSTEM_OPERATOR_TOKEN',
    'WRS_ACADEMY_ASSESSOR_TOKEN',
    'WRS_COMMUNITY_OPERATOR_TOKEN',
    'WRS_REFERRAL_QUALIFIER_TOKEN',
    'WRS_ACCOUNT_DELETION_WORKER_TOKEN',
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

test('Phase 11.1 includes the complete ordered Supabase SQL pack', async () => {
  const migrationsUrl = new URL('../../supabase/migrations/', import.meta.url)
  const migrations = (await readdir(migrationsUrl)).filter((name) => name.endsWith('.sql')).sort()
  assert.equal(migrations.length, 25, 'expected 25 ordered WRS migrations')
  assert.equal(migrations[0], '20260821030000_plan3_identity.sql')
  assert.equal(migrations.at(-1), '20260825010000_plan11_storage_activation.sql')

  const guide = await text('supabase/MIGRATION_GUIDE.md')
  for (const migration of migrations) assert.match(guide, new RegExp(migration.replaceAll('.', '\\.')))
  assert.match(guide, /timestamp order/i)
  assert.match(guide, /staging/i)
  assert.match(guide, /production/i)
  assert.match(guide, /rollback/i)

  const storage = await text('supabase/migrations/20260825010000_plan11_storage_activation.sql')
  assert.match(storage, /storage\.buckets/)
  assert.match(storage, /wrs-private-data/)
  assert.match(storage, /public,\s*file_size_limit/s)
  assert.match(storage, /52428800/)

  const verification = await text('supabase/verification/plan11_post_migration_checks.sql')
  assert.match(verification, /transaction read only/i)
  assert.match(verification, /relrowsecurity/)
  assert.match(verification, /ledger_entries/)
  assert.match(verification, /operations_audit_events/)
  assert.match(verification, /WRS Supabase post-migration verification PASS/)
})

test('Phase 11.1 records connected-resource evidence and manual live handoff', async () => {
  const evidence = await text('Docs/production-readiness/11-live-activation/PHASE-11.1-INFRASTRUCTURE.md')
  assert.match(evidence, /Supabase/i)
  assert.match(evidence, /Vercel/i)
  assert.match(evidence, /SQL\/REPOSITORY READY|MANUAL LIVE APPLICATION PENDING/i)
  assert.match(evidence, /NO-GO/i)
  assert.match(evidence, /crescivacapital/)
  assert.match(evidence, /zero projects|0 projects/i)
})
