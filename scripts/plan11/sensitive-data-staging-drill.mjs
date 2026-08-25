#!/usr/bin/env node
import crypto from 'node:crypto'
import { loadEvidence } from './evidence.mjs'

const matrix = loadEvidence('Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json')
const mode = String(process.argv[2] || process.env.WRS_DATA_DRILL_PHASE || 'prepare')
  .trim()
  .toLowerCase()
const base = String(process.env.WRS_STAGING_URL || '').replace(/\/$/, '')
const expectedCandidate = String(process.env.WRS_EXPECTED_RELEASE_CANDIDATE || matrix.releaseCandidate || '').trim()

if (!['prepare', 'finalize'].includes(mode)) throw new Error('WRS_DATA_DRILL_PHASE must be prepare or finalize')
if (!/^https:\/\//.test(base)) throw new Error('WRS_STAGING_URL must be an https URL')
if (!/^[0-9a-f]{40}$/i.test(expectedCandidate)) {
  throw new Error('Plan 11 evidence must identify a full release candidate SHA')
}

async function parseResponse(response, label) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const code = payload?.code ? ` (${payload.code})` : ''
    throw new Error(`${label} failed with HTTP ${response.status}${code}`)
  }
  return payload
}

async function attestRelease() {
  const response = await fetch(`${base}/api/health`, { headers: { accept: 'application/json' } })
  const payload = await parseResponse(response, 'release attestation')
  const expectedRelease = expectedCandidate.slice(0, 12).toLowerCase()
  const deployedRelease = String(payload?.release || '').toLowerCase()
  if (payload?.status !== 'ok' || deployedRelease !== expectedRelease) {
    throw new Error(`staging release mismatch: deployed=${deployedRelease || 'unknown'} expected=${expectedRelease}`)
  }
  return deployedRelease
}

function cookieHeader(response) {
  const values = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
  const fallback = response.headers.get('set-cookie')
  const cookies = values.length ? values : fallback ? [fallback] : []
  const pairs = cookies
    .map((value) => String(value).split(';', 1)[0].trim())
    .filter((value) => value.includes('='))
  if (!pairs.length) throw new Error('WRS login did not return session cookies')
  return pairs.join('; ')
}

async function appJson(path, { body, cookie, bearer } = {}) {
  const headers = {
    accept: 'application/json',
    origin: base,
  }
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (cookie) headers.cookie = cookie
  if (bearer) headers.authorization = `Bearer ${bearer}`
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { response, payload: await parseResponse(response, path) }
}

async function prepare() {
  const email = String(process.env.WRS_STAGING_TEST_EMAIL || '')
    .trim()
    .toLowerCase()
  const password = String(process.env.WRS_STAGING_TEST_PASSWORD || '')
  const scannerSecret = String(process.env.WRS_DATA_SCANNER_SECRET || '')
  const policyVersion = Number(process.env.WRS_CONSENT_POLICY_VERSION || 1)
  if (!email || !password) {
    throw new Error('WRS_STAGING_TEST_EMAIL and WRS_STAGING_TEST_PASSWORD are required')
  }
  if (!scannerSecret) throw new Error('WRS_DATA_SCANNER_SECRET is required')
  if (!Number.isInteger(policyVersion) || policyVersion <= 0) {
    throw new Error('WRS_CONSENT_POLICY_VERSION must be positive')
  }

  const loginResponse = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ identifier: email, password, rememberMe: false }),
  })
  const login = await parseResponse(loginResponse, '/api/auth/login')
  const cookie = cookieHeader(loginResponse)
  if (!login?.session?.emailVerified || !login?.session?.phoneVerified) {
    throw new Error('Synthetic staging identity must have verified email and phone')
  }
  if (login.session.accountDeletionPending) {
    throw new Error('Synthetic staging identity has account deletion pending')
  }

  await appJson('/api/data/consent', {
    cookie,
    body: {
      purposeSlug: 'dataset-contribution',
      dataCategory: 'document',
      action: 'granted',
      policyVersion,
      jurisdiction: 'synthetic-plan11',
      context: { synthetic: true, plan: 11 },
    },
  })

  const content = Buffer.from(`WRS Plan 11 synthetic private-data probe ${new Date().toISOString()}\n`, 'utf8')
  const checksumSha256 = crypto.createHash('sha256').update(content).digest('hex')
  const { payload: grant } = await appJson('/api/data/upload-grant', {
    cookie,
    body: {
      purposeSlug: 'dataset-contribution',
      dataCategory: 'document',
      mimeType: 'text/plain',
      sizeBytes: content.length,
      synthetic: true,
    },
  })
  if (!grant?.assetId || !grant?.signedUrl || !grant?.path) {
    throw new Error('Signed upload grant is incomplete')
  }
  if (!String(grant.path).includes('/document/')) {
    throw new Error('Server-owned storage path did not include document category')
  }

  const uploadResponse = await fetch(grant.signedUrl, {
    method: 'PUT',
    headers: { 'content-type': 'text/plain' },
    body: content,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Signed private upload failed with HTTP ${uploadResponse.status}`)
  }

  const { payload: uploaded } = await appJson('/api/data/upload-complete', {
    cookie,
    body: { assetId: grant.assetId, checksumSha256 },
  })
  if (uploaded?.scanStatus !== 'pending') throw new Error('Upload completion must remain scanStatus pending')

  const { payload: scanned } = await appJson('/api/data/scan', {
    bearer: scannerSecret,
    body: { assetId: grant.assetId, scanStatus: 'clean', synthetic: true },
  })
  if (scanned?.scanStatus !== 'clean') throw new Error('Trusted scanner did not record scanStatus clean')

  const { response: deletionResponse, payload: deletion } = await appJson('/api/data/delete', {
    cookie,
    body: { assetId: grant.assetId, reason: 'Synthetic Plan 11 storage/deletion lifecycle verification' },
  })
  if (deletionResponse.status !== 202 || deletion?.status !== 'requested') {
    throw new Error('Synthetic deletion request was not queued')
  }
  if (Number(deletion.earliestFinalizationSeconds) < 7200) {
    throw new Error('Deletion grace window is shorter than signed upload validity')
  }

  return {
    gate: 'storage-scanning-deletion',
    mode: 'prepare',
    status: 'PROBE_PREPARED',
    checkedAt: new Date().toISOString(),
    releaseCandidate: expectedCandidate,
    assetId: grant.assetId,
    storagePath: grant.path,
    uploadBytes: content.length,
    checksumSha256,
    scanStatusBeforeTrustedScan: uploaded.scanStatus,
    scanStatusAfterTrustedScan: scanned.scanStatus,
    deletionRequestId: deletion.requestId,
    earliestFinalizationSeconds: deletion.earliestFinalizationSeconds,
    synthetic: true,
    note: 'Preparation proves consent, private signed upload, pending-before-scan, trusted clean scan, and queued deletion. Run finalize after the grace window before considering deletion-worker evidence complete.',
  }
}

async function finalize() {
  const deletionSecret = String(process.env.WRS_DATA_DELETION_SECRET || '')
  const requestId = String(process.env.WRS_DATA_DELETION_REQUEST_ID || process.argv[3] || '').trim()
  if (!deletionSecret) throw new Error('WRS_DATA_DELETION_SECRET is required')
  if (!requestId) throw new Error('WRS_DATA_DELETION_REQUEST_ID is required for finalize')

  const observed = []
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { payload } = await appJson('/api/data/delete/process?limit=20', { bearer: deletionSecret })
    for (const outcome of payload?.outcomes || []) observed.push(outcome)
    const target = observed.find((outcome) => String(outcome.requestId) === requestId)
    if (target?.status === 'completed') {
      return {
        gate: 'storage-scanning-deletion',
        mode: 'finalize',
        status: 'PROBE_PASS',
        checkedAt: new Date().toISOString(),
        releaseCandidate: expectedCandidate,
        deletionRequestId: requestId,
        deletionStatus: target.status,
        deletedObjects: Number(target.deletedObjects || 0),
        synthetic: true,
        note: 'Internal deletion worker completed the exact synthetic request. A real malware-scanning provider must still be connected before the launch matrix gate can become PASS.',
      }
    }
    if (target?.status === 'retry-scheduled') {
      throw new Error('Synthetic deletion worker scheduled a retry')
    }
  }
  throw new Error(
    'Synthetic deletion request was not finalized; confirm the two-hour grant grace has elapsed and worker backlog is clear',
  )
}

await attestRelease()
const evidence = mode === 'prepare' ? await prepare() : await finalize()
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`)
