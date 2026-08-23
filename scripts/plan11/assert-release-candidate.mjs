#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { loadEvidence } from './evidence.mjs'

const matrixPath = 'Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json'
const matrix = loadEvidence(matrixPath)
const candidate = String(matrix.releaseCandidate || '').trim()
if (!/^[0-9a-f]{40}$/i.test(candidate)) throw new Error('releaseCandidate must be a full commit SHA')

const allowedPrefixes = ['Docs/production-readiness/11-live-activation/', 'scripts/plan11/', 'tests/plan11/']
const allowedExact = new Set([
  '.github/workflows/plan11-live-activation-gate.yml',
  'playwright.config.js',
  'tests/e2e/staging-public.spec.js',
])

let changed
try {
  changed = execFileSync('git', ['diff', '--name-only', `${candidate}..HEAD`], {
    encoding: 'utf8',
  })
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
} catch (error) {
  throw new Error(`Could not compare release candidate ${candidate} to HEAD. Ensure CI checks out full history.`, {
    cause: error,
  })
}

const runtimeDrift = changed.filter(
  (path) => !allowedExact.has(path) && !allowedPrefixes.some((prefix) => path.startsWith(prefix)),
)
if (runtimeDrift.length) {
  throw new Error(
    `Application/runtime drift detected after frozen release candidate ${candidate}: ${runtimeDrift.join(', ')}. ` +
      'Create a new application release candidate and update the evidence matrix before collecting live evidence.',
  )
}

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      releaseCandidate: candidate,
      evidenceOnlyChanges: changed,
    },
    null,
    2,
  ),
)
