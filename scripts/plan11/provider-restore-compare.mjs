#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import { loadEvidence } from './evidence.mjs'

const matrix = loadEvidence('Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json')
const sourceDatabaseUrl = String(process.env.WRS_RECOVERY_SOURCE_DB_URL || '').trim()
const restoredDatabaseUrl = String(process.env.WRS_RECOVERY_RESTORED_DB_URL || '').trim()
const syntheticEmail = String(process.env.WRS_STAGING_TEST_EMAIL || '')
  .trim()
  .toLowerCase()
const sourceFrozen =
  String(process.env.WRS_RECOVERY_SOURCE_FROZEN || '')
    .trim()
    .toLowerCase() === 'true'
const postgresImage = 'postgres:17-alpine'

function validateDatabaseUrl(value, label) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL connection URL`)
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`${label} must use postgres:// or postgresql://`)
  }
  if (!parsed.hostname || !parsed.username) throw new Error(`${label} is incomplete`)
  return parsed
}

if (!sourceFrozen) {
  throw new Error('WRS_RECOVERY_SOURCE_FROZEN=true is required before comparing a provider restore')
}
if (!syntheticEmail || !syntheticEmail.includes('@')) {
  throw new Error('WRS_STAGING_TEST_EMAIL is required for the synthetic recovery identity')
}
if (!/^[0-9a-f]{40}$/i.test(String(matrix.releaseCandidate || ''))) {
  throw new Error('Plan 11 evidence must identify a full release candidate SHA')
}
const sourceParsed = validateDatabaseUrl(sourceDatabaseUrl, 'WRS_RECOVERY_SOURCE_DB_URL')
const restoredParsed = validateDatabaseUrl(restoredDatabaseUrl, 'WRS_RECOVERY_RESTORED_DB_URL')
if (sourceDatabaseUrl === restoredDatabaseUrl) {
  throw new Error('Source and restored database URLs must identify different databases')
}
if (sourceParsed.host === restoredParsed.host && sourceParsed.pathname === restoredParsed.pathname) {
  throw new Error('Source and restored database targets resolve to the same host/database')
}

const fingerprintSql = String.raw`
with target as (
  select id
  from auth.users
  where lower(email) = lower(:'synthetic_email')
),
identity_snapshot as (
  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'phone', u.phone,
    'email_confirmed_at', u.email_confirmed_at,
    'phone_confirmed_at', u.phone_confirmed_at,
    'created_at', u.created_at,
    'banned_until', u.banned_until,
    'deleted_at', u.deleted_at
  ) value
  from auth.users u
  join target t on t.id = u.id
),
snapshot as (
  select jsonb_build_object(
    'auth.users', coalesce((select value from identity_snapshot), '{}'::jsonb),
    'public.user_profiles', coalesce((
      select to_jsonb(p)
      from public.user_profiles p
      join target t on t.id = p.user_id
    ), '{}'::jsonb),
    'public.robots', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.id)
      from public.robots r
      join target t on t.id = r.owner_user_id
    ), '[]'::jsonb),
    'public.package_entitlements', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.id)
      from public.package_entitlements e
      join target t on t.id = e.user_id
    ), '[]'::jsonb),
    'public.consent_events', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.id)
      from public.consent_events c
      join target t on t.id = c.user_id
    ), '[]'::jsonb),
    'public.data_assets', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.id)
      from public.data_assets a
      join target t on t.id = a.user_id
    ), '[]'::jsonb),
    'public.ledger_transactions', coalesce((
      select jsonb_agg(to_jsonb(tx) order by tx.id)
      from public.ledger_transactions tx
      join target t on t.id = tx.user_id
    ), '[]'::jsonb),
    'public.ledger_entries', coalesce((
      select jsonb_agg(to_jsonb(le) order by le.id)
      from public.ledger_entries le
      join public.ledger_transactions tx on tx.id = le.transaction_id
      join target t on t.id = tx.user_id
    ), '[]'::jsonb)
  ) value
)
select case
  when (select count(*) from target) <> 1 then ''
  else encode(digest(convert_to((select value::text from snapshot), 'UTF8'), 'sha256'), 'hex')
end;
`

function databaseFingerprint(databaseUrl, label) {
  const result = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '-i',
      '-e',
      'DATABASE_URL',
      '-e',
      'SYNTHETIC_EMAIL',
      postgresImage,
      'sh',
      '-lc',
      'exec psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -At -v "synthetic_email=$SYNTHETIC_EMAIL"',
    ],
    {
      input: fingerprintSql,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, DATABASE_URL: databaseUrl, SYNTHETIC_EMAIL: syntheticEmail },
    },
  )

  if (result.error) throw new Error(`${label} PostgreSQL fingerprint process failed`)
  if (result.status !== 0) throw new Error(`${label} PostgreSQL fingerprint query failed`)
  const fingerprint =
    String(result.stdout || '')
      .trim()
      .split(/\s+/)
      .pop() || ''
  if (!/^[0-9a-f]{64}$/i.test(fingerprint)) {
    throw new Error(`${label} synthetic recovery identity was missing or fingerprint output was invalid`)
  }
  return fingerprint.toLowerCase()
}

const sourceFingerprint = databaseFingerprint(sourceDatabaseUrl, 'source')
const restoredFingerprint = databaseFingerprint(restoredDatabaseUrl, 'restored')
const matched = crypto.timingSafeEqual(Buffer.from(sourceFingerprint, 'hex'), Buffer.from(restoredFingerprint, 'hex'))
if (!matched) throw new Error('Provider restore integrity fingerprint mismatch')

process.stdout.write(
  `${JSON.stringify(
    {
      gate: 'provider-backup-restore',
      status: 'PROBE_PASS',
      checkedAt: new Date().toISOString(),
      releaseCandidate: matrix.releaseCandidate,
      postgresImage,
      syntheticIdentity: true,
      sourceFrozen,
      sourceFingerprint,
      restoredFingerprint,
      matched,
      compared: [
        'auth.users',
        'public.user_profiles',
        'public.robots',
        'public.package_entitlements',
        'public.consent_events',
        'public.data_assets',
        'public.ledger_transactions',
        'public.ledger_entries',
      ],
      note: 'Read-only fingerprint comparison after an externally performed provider backup/PITR restore. PASS still requires the restore operation itself, timing, restore point and operator evidence to be recorded.',
    },
    null,
    2,
  )}\n`,
)
