#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { loadEvidence } from './evidence.mjs'

const matrix = loadEvidence('Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json')
const environment = String(process.env.WRS_VERCEL_ENVIRONMENT || '')
  .trim()
  .toLowerCase()
const token = String(process.env.VERCEL_TOKEN || '')
const orgId = String(process.env.VERCEL_ORG_ID || '').trim()
const projectId = String(process.env.VERCEL_PROJECT_ID || '').trim()
const candidateDeployment = String(process.env.WRS_VERCEL_STAGING_CANDIDATE_DEPLOYMENT || '').replace(/\/$/, '')
const previousDeployment = String(process.env.WRS_VERCEL_STAGING_PREVIOUS_DEPLOYMENT || '').replace(/\/$/, '')
const stagingUrl = String(process.env.WRS_STAGING_URL || '').replace(/\/$/, '')
const cliVersion = '59.5.0'

if (environment !== 'staging') {
  throw new Error('Vercel rollback drill refuses non-staging environments, including production')
}
if (!token) throw new Error('VERCEL_TOKEN is required')
if (!orgId) throw new Error('VERCEL_ORG_ID is required')
if (!/^prj_[A-Za-z0-9]+$/.test(projectId))
  throw new Error('VERCEL_PROJECT_ID must identify the dedicated staging project')
if (!/^https:\/\//.test(stagingUrl)) throw new Error('WRS_STAGING_URL must be HTTPS')
if (candidateDeployment === previousDeployment) throw new Error('Candidate and previous deployment must be different')
for (const [label, value] of [
  ['candidate', candidateDeployment],
  ['previous', previousDeployment],
]) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app')) {
    throw new Error(`${label} deployment must be a direct HTTPS vercel.app deployment URL`)
  }
}
if (!/^[0-9a-f]{40}$/i.test(String(matrix.releaseCandidate || ''))) {
  throw new Error('Plan 11 evidence must identify a full releaseCandidate SHA')
}

function vercel(args) {
  execFileSync('npx', ['--yes', `vercel@${cliVersion}`, ...args, '--token', token, '--scope', orgId, '--yes'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    env: { ...process.env, VERCEL_TOKEN: token, VERCEL_ORG_ID: orgId, VERCEL_PROJECT_ID: projectId },
    timeout: 120_000,
  })
}

async function health(base, label) {
  const response = await fetch(`${base}/api/health`, { headers: { accept: 'application/json' } })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.status !== 'ok' || !payload?.release) {
    throw new Error(`${label} /api/health failed with HTTP ${response.status}`)
  }
  return String(payload.release).toLowerCase()
}

async function waitForRelease(expected, label, timeoutMs = 90_000) {
  const started = Date.now()
  let observed = ''
  while (Date.now() - started <= timeoutMs) {
    observed = await health(stagingUrl, label).catch(() => '')
    if (observed === expected) return { observed, elapsedSeconds: Number(((Date.now() - started) / 1_000).toFixed(3)) }
    await new Promise((resolve) => setTimeout(resolve, 3_000))
  }
  throw new Error(`${label} did not converge to release ${expected}; observed=${observed || 'unavailable'}`)
}

const expectedCandidateRelease = matrix.releaseCandidate.slice(0, 12).toLowerCase()
const candidateDirectRelease = await health(candidateDeployment, 'candidate deployment')
const previousDirectRelease = await health(previousDeployment, 'previous deployment')
if (candidateDirectRelease !== expectedCandidateRelease) {
  throw new Error(`candidate deployment release mismatch: ${candidateDirectRelease} != ${expectedCandidateRelease}`)
}
if (previousDirectRelease === expectedCandidateRelease) {
  throw new Error('previous deployment must represent a different known-good release')
}

let candidatePromotionSeconds = null
let rollbackSeconds = null
let restoreSeconds = null
let finalCandidateRestored = false
let primaryError = null

try {
  const promoteStarted = Date.now()
  vercel(['promote', candidateDeployment])
  const promoted = await waitForRelease(expectedCandidateRelease, 'candidate promotion')
  candidatePromotionSeconds = Number(((Date.now() - promoteStarted) / 1_000).toFixed(3))
  if (!promoted.observed) throw new Error('candidate promotion did not return release evidence')

  const rollbackStarted = Date.now()
  vercel(['rollback', previousDeployment])
  const rolledBack = await waitForRelease(previousDirectRelease, 'rollback')
  rollbackSeconds = Number(((Date.now() - rollbackStarted) / 1_000).toFixed(3))
  if (!rolledBack.observed) throw new Error('rollback did not return release evidence')
} catch (error) {
  primaryError = error
} finally {
  const restoreStarted = Date.now()
  try {
    vercel(['promote', candidateDeployment])
    await waitForRelease(expectedCandidateRelease, 'candidate restore')
    restoreSeconds = Number(((Date.now() - restoreStarted) / 1_000).toFixed(3))
    finalCandidateRestored = true
  } catch (restoreError) {
    const detail = restoreError instanceof Error ? restoreError.message : String(restoreError)
    if (primaryError) {
      throw new Error(
        `rollback drill failed and candidate restore also failed: ${primaryError.message}; restore=${detail}`,
      )
    }
    throw new Error(`candidate restore failed after rollback drill: ${detail}`)
  }
}

if (primaryError) throw primaryError
if (!finalCandidateRestored) throw new Error('finalCandidateRestored invariant failed')

process.stdout.write(
  `${JSON.stringify(
    {
      gate: 'hosting-rollback',
      status: 'PROBE_PASS',
      checkedAt: new Date().toISOString(),
      releaseCandidate: matrix.releaseCandidate,
      environment,
      projectId,
      cliVersion,
      candidateDeployment,
      previousDeployment,
      previousRelease: previousDirectRelease,
      candidatePromotionSeconds,
      rollbackSeconds,
      restoreSeconds,
      finalCandidateRestored,
      note: 'Dedicated staging project only. Candidate promotion, rollback to the named previous deployment, and final candidate restoration were all health-attested. Production hosting remains untouched.',
    },
    null,
    2,
  )}\n`,
)
