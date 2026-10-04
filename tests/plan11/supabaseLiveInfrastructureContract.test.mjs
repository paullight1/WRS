import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const loadAudit = () => import('../../scripts/plan11/supabase-live-audit.mjs')
const refs = { staging: 'bymiojfdlkspawvakrif', production: 'zaujrbcvgargyabebjyj' }
const environment = (target) => ({
  WRS_SUPABASE_AUDIT_TARGET: target,
  WRS_SUPABASE_AUDIT_PROJECT_REF: refs[target],
  WRS_SUPABASE_AUDIT_URL: `https://${refs[target]}.supabase.co`,
  WRS_SUPABASE_AUDIT_PUBLISHABLE_KEY: 'sb_publishable_synthetic_key',
  WRS_SUPABASE_AUDIT_DB_URL: `postgresql://postgres:synthetic_password@db.${refs[target]}.supabase.co:5432/postgres`,
})
const goodAudit = () => ({
  serverVersion: '17.6', serverVersionNum: '170006', pgcrypto: true,
  migrations: [{ version: '20990101000000', name: 'fixture' }],
  tables: ['public.user_profiles', 'public.robots', 'public.package_entitlements', 'public.ledger_transactions', 'public.consent_events', 'public.data_assets', 'public.deployment_opportunities', 'public.marketplace_items', 'public.support_tickets'].map((name) => ({ name, exists: true, relrowsecurity: true })),
  bucket: { id: 'wrs-private-data', public: false, file_size_limit: 52428800, allowed_mime_types: ['audio/webm', 'audio/mpeg', 'video/webm', 'video/mp4', 'image/jpeg', 'image/png', 'application/pdf', 'text/plain'] },
})

test('audit requires an explicit known target and matching project identity', async () => {
  const { auditConfiguration } = await loadAudit()
  for (const target of Object.keys(refs)) {
    assert.equal(auditConfiguration(environment(target)).target, target)
    assert.throws(() => auditConfiguration({ ...environment(target), WRS_SUPABASE_AUDIT_PROJECT_REF: refs[target === 'staging' ? 'production' : 'staging'] }), /PROJECT_REF.*target/)
    assert.throws(() => auditConfiguration({ ...environment(target), WRS_SUPABASE_AUDIT_URL: 'https://wrong.supabase.co' }), /URL.*PROJECT_REF/)
    for (const key of Object.keys(environment(target))) assert.throws(() => auditConfiguration({ ...environment(target), [key]: '' }))
  }
  assert.throws(() => auditConfiguration({ ...environment('staging'), WRS_SUPABASE_AUDIT_TARGET: 'preview' }), /TARGET/)
})

test('database connection is bound to the declared project for canonical direct and pooler URLs', async () => {
  const { auditConfiguration } = await loadAudit()
  for (const target of Object.keys(refs)) {
    const otherRef = refs[target === 'staging' ? 'production' : 'staging']
    const pooler = `postgresql://postgres.${refs[target]}:synthetic_password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
    assert.doesNotThrow(() => auditConfiguration({ ...environment(target), WRS_SUPABASE_AUDIT_DB_URL: pooler }))
    assert.doesNotThrow(() => auditConfiguration({ ...environment(target), WRS_SUPABASE_AUDIT_DB_URL: pooler + '?sslmode=require&connect_timeout=15' }))
    for (const databaseUrl of [
      `postgresql://postgres:synthetic_password@db.${otherRef}.supabase.co:5432/postgres`,
      pooler.replace(`postgres.${refs[target]}`, `postgres.${otherRef}`),
      pooler.replace('aws-0-eu-west-1.pooler.supabase.com', 'pooler.supabase.com.evil.invalid'),
      pooler.replace('aws-0-eu-west-1.pooler.supabase.com', 'evil.invalid'),
      pooler.replace(`postgres.${refs[target]}`, 'postgres'),
      pooler + '?host=db.' + otherRef + '.supabase.co',
      pooler + '?user=postgres.' + otherRef,
      pooler + '?service=another-project',
      environment(target).WRS_SUPABASE_AUDIT_DB_URL.replace('postgres:', 'operator:'),
    ]) assert.throws(() => auditConfiguration({ ...environment(target), WRS_SUPABASE_AUDIT_DB_URL: databaseUrl }), /DB_URL.*target/)
  }
})

test('infrastructure rejects missing RLS, tables, bad Postgres and misconfigured private buckets', async () => {
  const { validateInfrastructure } = await loadAudit()
  assert.doesNotThrow(() => validateInfrastructure(goodAudit(), ['fixture']))
  for (const mutate of [
    (a) => { a.serverVersionNum = '160000' }, (a) => { a.pgcrypto = false },
    (a) => { a.tables.pop() }, (a) => { a.tables[0].exists = false }, (a) => { a.tables[0].relrowsecurity = false },
    (a) => { a.bucket = null }, (a) => { a.bucket.public = true },
    (a) => { a.bucket.file_size_limit = null }, (a) => { a.bucket.file_size_limit = 52428801 },
    (a) => { a.bucket.allowed_mime_types = [] },
    (a) => { a.migrations = [] }, (a) => { a.migrations.push({ name: 'extra' }) },
  ]) { const audit = goodAudit(); mutate(audit); assert.throws(() => validateInfrastructure(audit, ['fixture'])) }
})

test('Auth failures fail closed before database probe; output includes audit names and no credentials or row data', async () => {
  const { runAudit } = await loadAudit()
  for (const target of Object.keys(refs)) {
    let databaseCalls = 0
    const dependencies = { env: environment(target), migrationFiles: ['20261001000000_fixture.sql'], releaseCandidate: 'a'.repeat(40), fetch: async () => ({ ok: true }), postgresAudit: () => { databaseCalls++; return goodAudit() } }
    const result = await runAudit(dependencies)
    assert.equal(result.target, target)
    assert.equal(result.projectRef, refs[target])
    assert.deepEqual(result.repositoryMigrationNames, ['fixture'])
    assert.deepEqual(result.appliedMigrationNames, ['fixture'])
    assert.equal(result.repositoryMigrationCount, 1)
    assert.equal(result.appliedMigrationCount, 1)
    assert.equal(result.status, 'PROBE_PASS')
    assert.equal(result.authHealth, 'ok')
    assert.equal(databaseCalls, 1)
    assert.doesNotMatch(JSON.stringify(result), /synthetic_password|sb_publishable_|postgresql:\/\/|rowData/)
    databaseCalls = 0
    await assert.rejects(runAudit({ ...dependencies, fetch: async () => ({ ok: false, status: 503 }) }), /Auth health.*503/)
    assert.equal(databaseCalls, 0)
    await assert.rejects(runAudit({ ...dependencies, fetch: async () => { throw new Error('credential-containing upstream failure') } }), /Auth health request failed/)
  }
})

test('Supabase live audit is manual and scoped to one declared protected environment', () => {
  const workflow = fs.readFileSync('.github/workflows/plan11-live-activation-gate.yml', 'utf8')
  assert.match(workflow, /supabase_audit_target:[\s\S]*?type: choice[\s\S]*?- staging[\s\S]*?- production/)
  const job = workflow.split('  supabase-live-infrastructure:')[1].split('\n  strict-go:')[0]
  assert.match(job, /github\.event_name == 'workflow_dispatch'/)
  assert.match(job, /environment: \$\{\{ inputs\.supabase_audit_target \}\}/)
  for (const name of ['TARGET', 'DB_URL', 'PUBLISHABLE_KEY', 'PROJECT_REF', 'URL']) assert.match(job, new RegExp(`WRS_SUPABASE_AUDIT_${name}`))
  assert.match(job, /secrets\.WRS_SUPABASE_AUDIT_DB_URL/)
  assert.match(job, /vars\.WRS_SUPABASE_AUDIT_PROJECT_REF/)
  assert.doesNotMatch(job, /WRS_SUPABASE_STAGING_|strategy:|matrix:/)
})


test('Supabase workflow audit failure cannot be masked by tee', () => {
  const workflow = fs.readFileSync('.github/workflows/plan11-live-activation-gate.yml', 'utf8')
  const job = workflow.split('  supabase-live-infrastructure:')[1].split('\n  strict-go:')[0]
  const run = job.match(/^      - run: (.*)(?:\n((?:          .*\n)+))?/m)
  assert.ok(run, 'Supabase audit step must exist')
  const script = run[1] === '|' ? run[2].split('\n').map((line) => line.replace(/^          /, '')).join('\n') : run[1]
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wrs-task1-audit-pipeline-'))
  try {
    fs.mkdirSync(path.join(root, 'bin'))
    fs.writeFileSync(path.join(root, 'bin/node'), '#!/bin/sh\nprintf "synthetic audit output\\n"\nexit "$WRS_TASK1_AUDIT_EXIT"\n', { mode: 0o755 })
    for (const exitCode of [17, 0]) {
      // Plain bash reproduces the unspecified GitHub shell. Safety must also be
      // present in the extracted script, independent of runner default flags.
      const result = spawnSync('bash', ['--noprofile', '--norc', '-c', script], {
        cwd: root, encoding: 'utf8', env: { ...process.env, PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, WRS_TASK1_AUDIT_EXIT: String(exitCode) },
      })
      assert.equal(result.status, exitCode, `audit exit ${exitCode} was masked by tee: ${result.stderr}`)
      assert.equal(fs.readFileSync(path.join(root, 'plan11-supabase-live-infrastructure.json'), 'utf8'), 'synthetic audit output\n')
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
  assert.match(job, /shell: bash/)
})
