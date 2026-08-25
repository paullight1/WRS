#!/usr/bin/env node
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { loadEvidence } from './evidence.mjs'

const matrix = loadEvidence('Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json')
const databaseUrl = String(process.env.WRS_SUPABASE_STAGING_DB_URL || '').trim()
const projectUrl = String(process.env.WRS_SUPABASE_STAGING_URL || '').replace(/\/$/, '')
const publishableKey = String(process.env.WRS_SUPABASE_STAGING_PUBLISHABLE_KEY || '').trim()
const projectRef = String(process.env.WRS_SUPABASE_STAGING_PROJECT_REF || '').trim()
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

if (!/^[a-z0-9]{20}$/.test(projectRef)) throw new Error('WRS_SUPABASE_STAGING_PROJECT_REF is invalid')
if (!/^sb_publishable_/.test(publishableKey)) {
  throw new Error('WRS_SUPABASE_STAGING_PUBLISHABLE_KEY must use a modern Supabase publishable key')
}
let project
try {
  project = new URL(projectUrl)
} catch {
  throw new Error('WRS_SUPABASE_STAGING_URL must be a valid HTTPS URL')
}
if (project.protocol !== 'https:' || project.hostname !== `${projectRef}.supabase.co`) {
  throw new Error('WRS_SUPABASE_STAGING_URL does not match WRS_SUPABASE_STAGING_PROJECT_REF')
}
let database
try {
  database = new URL(databaseUrl)
} catch {
  throw new Error('WRS_SUPABASE_STAGING_DB_URL must be a valid PostgreSQL URL')
}
if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
  throw new Error('WRS_SUPABASE_STAGING_DB_URL must use postgres:// or postgresql://')
}
if (!/^[0-9a-f]{40}$/i.test(String(matrix.releaseCandidate || ''))) {
  throw new Error('Plan 11 evidence must identify a full release candidate SHA')
}

const repositoryMigrationVersions = fs
  .readdirSync('supabase/migrations')
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .map((name) => name.split('_', 1)[0])
  .sort()
if (!repositoryMigrationVersions.length) throw new Error('No repository migrations found')

const tableValues = criticalTables.map((name) => `'${name.replaceAll("'", "''")}'`).join(',')
const auditSql = String.raw`
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
  'migrationVersions', coalesce((
    select jsonb_agg(sm.version order by sm.version)
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
`

function postgresAudit() {
  const result = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '-i',
      '-e',
      'DATABASE_URL',
      postgresImage,
      'sh',
      '-lc',
      'exec psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -At',
    ],
    {
      input: auditSql,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    },
  )
  if (result.error || result.status !== 0) throw new Error('Live Supabase PostgreSQL audit failed')
  const line = String(result.stdout || '').trim().split('\n').filter(Boolean).pop() || ''
  try {
    return JSON.parse(line)
  } catch {
    throw new Error('Live Supabase PostgreSQL audit returned invalid JSON')
  }
}

const authHealth = await fetch(`${projectUrl}/auth/v1/health`, {
  headers: { apikey: publishableKey, accept: 'application/json' },
})
if (!authHealth.ok) throw new Error(`Supabase Auth health failed with HTTP ${authHealth.status}`)

const audit = postgresAudit()
if (!String(audit.serverVersionNum || '').startsWith('17')) {
  throw new Error(`Supabase PostgreSQL major version must be 17; observed ${audit.serverVersion || 'unknown'}`)
}
if (audit.pgcrypto !== true) throw new Error('pgcrypto extension is not installed')

const deployedVersions = new Set((audit.migrationVersions || []).map(String))
const missingMigrations = repositoryMigrationVersions.filter((version) => !deployedVersions.has(version))
if (missingMigrations.length) {
  throw new Error(`Live Supabase is missing repository migrations: ${missingMigrations.join(', ')}`)
}

const missingTables = (audit.tables || []).filter((table) => table.exists !== true).map((table) => table.name)
if (missingTables.length) throw new Error(`Live Supabase is missing critical WRS tables: ${missingTables.join(', ')}`)
if ((audit.rlsMissing || []).length) {
  throw new Error(`Live Supabase critical tables lack RLS: ${audit.rlsMissing.join(', ')}`)
}

const bucket = audit.bucket
if (!bucket || bucket.id !== privateBucket) throw new Error(`storage.buckets is missing ${privateBucket}`)
if (bucket.public !== false) throw new Error(`${privateBucket} must remain private`)
const fileSizeLimit = Number(bucket.file_size_limit)
if (!Number.isFinite(fileSizeLimit) || fileSizeLimit <= 0 || fileSizeLimit > maxUploadBytes) {
  throw new Error(`${privateBucket} file size limit must be configured at or below ${maxUploadBytes} bytes`)
}
const allowedMimeTypes = new Set((bucket.allowed_mime_types || []).map(String))
const missingMimeTypes = requiredMimeTypes.filter((mime) => !allowedMimeTypes.has(mime))
if (missingMimeTypes.length) {
  throw new Error(`${privateBucket} is missing required MIME allowlist entries: ${missingMimeTypes.join(', ')}`)
}

process.stdout.write(
  `${JSON.stringify(
    {
      gate: 'supabase-infrastructure',
      status: 'PROBE_PASS',
      checkedAt: new Date().toISOString(),
      releaseCandidate: matrix.releaseCandidate,
      projectRef,
      projectHost: project.hostname,
      postgresImage,
      serverVersion: audit.serverVersion,
      pgcrypto: true,
      repositoryMigrationCount: repositoryMigrationVersions.length,
      deployedMigrationCount: deployedVersions.size,
      criticalTables,
      relrowsecurity: true,
      privateBucket: {
        id: privateBucket,
        public: false,
        fileSizeLimit,
        allowedMimeTypes: [...allowedMimeTypes].sort(),
      },
      authHealth: 'ok',
      note: 'Live staging audit only. Production needs its own separately provisioned project, secrets, advisor review and equivalent evidence before the infrastructure gate can become PASS.',
    },
    null,
    2,
  )}\n`,
)
