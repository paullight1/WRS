#!/usr/bin/env node
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { loadEvidence } from './evidence.mjs'

const projectRefs = Object.freeze({
  staging: 'bymiojfdlkspawvakrif',
  production: 'zaujrbcvgargyabebjyj',
})
const privateBucket = 'wrs-private-data'
const postgresImage = 'postgres:17-alpine'
const maxUploadBytes = 50 * 1024 * 1024
const requiredMimeTypes = [
  'audio/webm',
  'audio/mpeg',
  'video/webm',
  'video/mp4',
  'image/jpeg',
  'image/png',
  'application/pdf',
  'text/plain',
]
const criticalTables = [
  'public.user_profiles',
  'public.robots',
  'public.package_entitlements',
  'public.ledger_transactions',
  'public.consent_events',
  'public.data_assets',
  'public.deployment_opportunities',
  'public.marketplace_items',
  'public.support_tickets',
]

export function auditConfiguration(env) {
  const target = String(env.WRS_SUPABASE_AUDIT_TARGET || '').trim()
  if (!Object.hasOwn(projectRefs, target)) throw new Error('WRS_SUPABASE_AUDIT_TARGET must be staging or production')
  const projectRef = String(env.WRS_SUPABASE_AUDIT_PROJECT_REF || '').trim()
  if (projectRef !== projectRefs[target]) throw new Error('WRS_SUPABASE_AUDIT_PROJECT_REF does not match declared target')
  const publishableKey = String(env.WRS_SUPABASE_AUDIT_PUBLISHABLE_KEY || '').trim()
  if (!/^sb_publishable_\S+$/.test(publishableKey)) throw new Error('WRS_SUPABASE_AUDIT_PUBLISHABLE_KEY must use a modern Supabase publishable key')
  let project
  try { project = new URL(String(env.WRS_SUPABASE_AUDIT_URL || '').trim()) }
  catch { throw new Error('WRS_SUPABASE_AUDIT_URL must be a valid HTTPS URL') }
  if (project.protocol !== 'https:' || project.hostname !== `${projectRef}.supabase.co` || project.username || project.password || project.port || project.pathname !== '/' || project.search || project.hash) {
    throw new Error('WRS_SUPABASE_AUDIT_URL does not match WRS_SUPABASE_AUDIT_PROJECT_REF')
  }
  const databaseUrl = String(env.WRS_SUPABASE_AUDIT_DB_URL || '').trim()
  let database
  try { database = new URL(databaseUrl) }
  catch { throw new Error('WRS_SUPABASE_AUDIT_DB_URL must be a valid PostgreSQL URL') }
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || !database.username || !database.password || database.pathname !== '/postgres') {
    throw new Error('WRS_SUPABASE_AUDIT_DB_URL must be a complete postgres:// or postgresql:// connection URL')
  }
  // Support canonical Supabase direct connections and poolers only. The host and
  // exact database username must identify the same mapped project as the HTTPS URL.
  // Only sslmode and connect_timeout URI options are supported: libpq's host,
  // user, dbname, service and options parameters could override the validated identity.
  const supportedOptions = {
    sslmode: /^(disable|allow|prefer|require|verify-ca|verify-full)$/,
    connect_timeout: /^[1-9]\d*$/,
  }
  const optionNames = new Set()
  for (const [name, value] of database.searchParams) {
    if (!Object.hasOwn(supportedOptions, name) || !supportedOptions[name].test(value) || optionNames.has(name)) {
      throw new Error('WRS_SUPABASE_AUDIT_DB_URL options do not match declared target connection contract')
    }
    optionNames.add(name)
  }
  if (database.hash) throw new Error('WRS_SUPABASE_AUDIT_DB_URL does not match declared target')
  const direct = database.hostname === `db.${projectRef}.supabase.co` && database.username === 'postgres'
  const pooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(database.hostname) && database.username === `postgres.${projectRef}`
  if (!direct && !pooler) throw new Error('WRS_SUPABASE_AUDIT_DB_URL does not match declared target')
  return { target, projectRef, projectUrl: project.origin, projectHost: project.hostname, publishableKey, databaseUrl }
}

export function repositoryMigrationNames(files) {
  const filenames = [...files].sort()
  if (!filenames.length) throw new Error('No repository migrations found')
  const names = filenames.map((file) => {
    const match = /^(\d+)_(.+)\.sql$/.exec(file)
    if (!match) throw new Error('Invalid repository migration filename')
    return match[2]
  })
  if (new Set(names).size !== names.length) throw new Error('Duplicate repository migration name')
  return names
}

export function assertMigrationParity(repositoryNames, appliedMigrations) {
  if (!Array.isArray(appliedMigrations)) throw new Error('Invalid applied migration names')
  const appliedNames = appliedMigrations.map((row) => {
    if (typeof row?.name !== 'string' || !row.name.trim()) throw new Error('Invalid applied migration name')
    return row.name
  }).sort()
  if (new Set(appliedNames).size !== appliedNames.length) throw new Error('Duplicate applied migration name')
  const appliedSet = new Set(appliedNames)
  const repositorySet = new Set(repositoryNames)
  const missing = repositoryNames.filter((name) => !appliedSet.has(name))
  const unexpected = appliedNames.filter((name) => !repositorySet.has(name))
  if (missing.length || unexpected.length) {
    throw new Error(`Live Supabase migration names differ: missing [${missing.join(', ')}]; unexpected [${unexpected.join(', ')}]`)
  }
  return appliedNames
}

const tableValues = criticalTables.map((name) => `'${name.replaceAll("'", "''")}'`).join(',')
const auditSql = String.raw`
begin transaction read only;
with critical(name) as (
  select unnest(array[${tableValues}]::text[])
),
table_state as (
  select
    c.name,
    to_regclass(c.name) is not null as exists,
    coalesce(pc.relrowsecurity, false) as relrowsecurity
  from critical c
  left join pg_class pc on pc.oid = to_regclass(c.name)
),
bucket_state as (
  select jsonb_build_object(
    'id', b.id,
    'public', b.public,
    'file_size_limit', b.file_size_limit,
    'allowed_mime_types', coalesce(to_jsonb(b.allowed_mime_types), '[]'::jsonb)
  ) value
  from storage.buckets b
  where b.id = '${privateBucket}'
)
select jsonb_build_object(
  'serverVersion', current_setting('server_version'),
  'serverVersionNum', current_setting('server_version_num'),
  'pgcrypto', exists(select 1 from pg_extension where extname = 'pgcrypto'),
  'migrations', coalesce((
    select jsonb_agg(jsonb_build_object('name', sm.name, 'version', sm.version) order by sm.name)
    from supabase_migrations.schema_migrations sm
  ), '[]'::jsonb),
  'tables', coalesce((
    select jsonb_agg(jsonb_build_object('name', ts.name, 'exists', ts.exists, 'relrowsecurity', ts.relrowsecurity) order by ts.name)
    from table_state ts
  ), '[]'::jsonb),
  'rlsMissing', coalesce((
    select jsonb_agg(ts.name order by ts.name)
    from table_state ts
    where not ts.exists or not ts.relrowsecurity
  ), '[]'::jsonb),
  'bucket', coalesce((select value from bucket_state), 'null'::jsonb)
)::text;
rollback;
`

function postgresAudit(databaseUrl) {
  const result = spawnSync('docker', [
    'run', '--rm', '-i', '-e', 'DATABASE_URL', postgresImage,
    'sh', '-lc', 'exec psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -At',
  ], {
    input: auditSql, encoding: 'utf8', timeout: 120_000, maxBuffer: 1024 * 1024,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  })
  if (result.error || result.status !== 0) throw new Error('Live Supabase PostgreSQL audit failed')
  try { return JSON.parse(String(result.stdout || '').trim()) }
  catch { throw new Error('Live Supabase PostgreSQL audit returned invalid JSON') }
}

export function validateInfrastructure(audit, repositoryNames) {
  if (!/^17\d{4}$/.test(String(audit.serverVersionNum || ''))) throw new Error('Supabase PostgreSQL major version must be 17')
  if (audit.pgcrypto !== true) throw new Error('pgcrypto extension is not installed')
  const appliedNames = assertMigrationParity(repositoryNames, audit.migrations)
  for (const name of criticalTables) {
    const states = (Array.isArray(audit.tables) ? audit.tables : []).filter((table) => table.name === name)
    if (states.length !== 1 || states[0].exists !== true) throw new Error(`Live Supabase is missing critical WRS table: ${name}`)
    if (states[0].relrowsecurity !== true) throw new Error(`Live Supabase critical table lacks RLS: ${name}`)
  }
  const bucket = audit.bucket
  if (!bucket || bucket.id !== privateBucket) throw new Error(`storage.buckets is missing ${privateBucket}`)
  if (bucket.public !== false) throw new Error(`${privateBucket} must remain private`)
  const fileSizeLimit = Number(bucket.file_size_limit)
  if (!Number.isSafeInteger(fileSizeLimit) || fileSizeLimit <= 0 || fileSizeLimit > maxUploadBytes) {
    throw new Error(`${privateBucket} file size limit must be configured at or below ${maxUploadBytes} bytes`)
  }
  if (!Array.isArray(bucket.allowed_mime_types) || bucket.allowed_mime_types.some((mime) => typeof mime !== 'string')) {
    throw new Error(`${privateBucket} requires a MIME allowlist`)
  }
  const allowedMimeTypes = new Set(bucket.allowed_mime_types)
  const missingMimeTypes = requiredMimeTypes.filter((mime) => !allowedMimeTypes.has(mime))
  if (missingMimeTypes.length) throw new Error(`${privateBucket} is missing required MIME allowlist entries: ${missingMimeTypes.join(', ')}`)
  return { appliedNames, fileSizeLimit, allowedMimeTypes: [...allowedMimeTypes].sort() }
}

export async function runAudit({ env = process.env, migrationFiles, releaseCandidate, fetch: fetchHealth = globalThis.fetch, postgresAudit: queryDatabase = postgresAudit } = {}) {
  const config = auditConfiguration(env)
  const candidate = releaseCandidate ?? loadEvidence('Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json').releaseCandidate
  if (!/^[0-9a-f]{40}$/i.test(String(candidate || ''))) throw new Error('Plan 11 evidence must identify a full release candidate SHA')
  const repositoryNames = repositoryMigrationNames(migrationFiles ?? fs.readdirSync('supabase/migrations').filter((name) => name.endsWith('.sql')))
  let authHealth
  try {
    authHealth = await fetchHealth(`${config.projectUrl}/auth/v1/health`, {
      headers: { apikey: config.publishableKey, accept: 'application/json' },
      signal: AbortSignal.timeout(30_000), redirect: 'error',
    })
  } catch { throw new Error('Supabase Auth health request failed') }
  if (!authHealth.ok) throw new Error(`Supabase Auth health failed with HTTP ${authHealth.status}`)
  const audit = await queryDatabase(config.databaseUrl)
  const state = validateInfrastructure(audit, repositoryNames)
  return {
    gate: 'supabase-infrastructure', status: 'PROBE_PASS', checkedAt: new Date().toISOString(),
    releaseCandidate: candidate, target: config.target, projectRef: config.projectRef, projectHost: config.projectHost,
    postgresImage, serverVersion: audit.serverVersion, pgcrypto: true,
    repositoryMigrationNames: repositoryNames, repositoryMigrationCount: repositoryNames.length,
    appliedMigrationNames: state.appliedNames, appliedMigrationCount: state.appliedNames.length,
    criticalTables, relrowsecurity: true,
    privateBucket: { id: privateBucket, public: false, fileSizeLimit: state.fileSizeLimit, allowedMimeTypes: state.allowedMimeTypes },
    authHealth: 'ok',
    note: 'Read-only infrastructure probe for the declared target. This does not grant a Plan 11 gate or human approval PASS.',
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(`${JSON.stringify(await runAudit(), null, 2)}\n`) }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1 }
}
