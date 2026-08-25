import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('live Supabase audit verifies project identity, PostgreSQL 17, RLS, migrations and private storage', () => {
  const source = fs.readFileSync('scripts/plan11/supabase-live-audit.mjs', 'utf8')
  for (const marker of [
    'WRS_SUPABASE_STAGING_DB_URL',
    'WRS_SUPABASE_STAGING_URL',
    'WRS_SUPABASE_STAGING_PUBLISHABLE_KEY',
    'WRS_SUPABASE_STAGING_PROJECT_REF',
    'postgres:17-alpine',
    'pgcrypto',
    'relrowsecurity',
    'storage.buckets',
    'wrs-private-data',
    'supabase_migrations.schema_migrations',
    'public.user_profiles',
    'public.robots',
    'public.ledger_transactions',
    'public.consent_events',
    'public.deployment_opportunities',
    'public.marketplace_items',
    'public.support_tickets',
  ]) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.doesNotMatch(source, /console\.log\([^)]*(DB_URL|PUBLISHABLE_KEY)/)
})

test('Supabase live audit is manual and uses staging-only scoped secrets', () => {
  const workflow = fs.readFileSync('.github/workflows/plan11-live-activation-gate.yml', 'utf8')
  assert.match(workflow, /run_supabase_live_audit/)
  assert.match(workflow, /supabase-live-infrastructure/)
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/)
  assert.match(workflow, /secrets\.WRS_SUPABASE_STAGING_DB_URL/)
  assert.match(workflow, /secrets\.WRS_SUPABASE_STAGING_PUBLISHABLE_KEY/)
  assert.match(workflow, /vars\.WRS_SUPABASE_STAGING_PROJECT_REF/)
  assert.match(workflow, /plan11-supabase-live-infrastructure/)
})
