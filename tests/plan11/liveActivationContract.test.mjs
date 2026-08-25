import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { decision, loadEvidence, REQUIRED_GATES } from '../../scripts/plan11/evidence.mjs'

const matrixPath = 'Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json'
const humanSignoffGates = new Set(['manual-accessibility', 'legal-privacy-compliance', 'named-launch-owners'])

function passGate(gate) {
  return {
    ...gate,
    status: 'PASS',
    evidenceRef: `run:test:${gate.id}`,
    checkedAt: '2026-08-23T06:30:00.000Z',
    ...(humanSignoffGates.has(gate.id) ? { approvedBy: ['Named Reviewer'] } : {}),
  }
}

test('Plan 11 live-activation phase files and machine-readable evidence exist', () => {
  assert.ok(fs.existsSync(matrixPath))
  for (let phase = 1; phase <= 10; phase += 1) {
    const docs = fs.readdirSync('Docs/production-readiness/11-live-activation')
    assert.ok(
      docs.some((name) => name.startsWith(`phase-11.${phase}-`)),
      `phase 11.${phase}`,
    )
  }
})

test('launch evidence is fail-closed and every required live gate is represented', () => {
  const matrix = loadEvidence(matrixPath)
  const result = decision(matrix)
  assert.equal(REQUIRED_GATES.length, 14)
  assert.equal(result.issues.length, 0)
  assert.equal(result.decision, 'NO_GO')
  assert.ok(result.blockers.length > 0)
  assert.ok(result.blockers.every((gate) => gate.status !== 'PASS'))
})

test('GO requires every required gate to have structured PASS evidence', () => {
  const matrix = loadEvidence(matrixPath)
  const unprovenPass = { ...matrix, gates: matrix.gates.map((gate) => ({ ...gate, status: 'PASS' })) }
  assert.equal(decision(unprovenPass).decision, 'NO_GO')
  assert.ok(decision(unprovenPass).issues.some((issue) => issue.includes('evidenceRef')))

  const allPass = { ...matrix, gates: matrix.gates.map(passGate) }
  assert.equal(decision(allPass).decision, 'GO')

  const oneBlocked = {
    ...allPass,
    gates: allPass.gates.map((gate, index) =>
      index === 0 ? { ...gate, status: 'EXTERNAL_BLOCKER', evidenceRef: undefined, checkedAt: undefined } : gate,
    ),
  }
  assert.equal(decision(oneBlocked).decision, 'NO_GO')
})

test('strict GO evidence is bound to the explicitly selected application release candidate', () => {
  const matrix = loadEvidence(matrixPath)
  const allPass = { ...matrix, gates: matrix.gates.map(passGate) }
  assert.equal(decision(allPass, { expectedReleaseCandidate: matrix.releaseCandidate }).decision, 'GO')
  const mismatch = decision(allPass, { expectedReleaseCandidate: 'f'.repeat(40) })
  assert.equal(mismatch.decision, 'NO_GO')
  assert.ok(mismatch.issues.some((issue) => issue.includes('release candidate mismatch')))

  const workflow = fs.readFileSync('.github/workflows/plan11-live-activation-gate.yml', 'utf8')
  assert.match(workflow, /release_candidate_sha/)
  assert.match(workflow, /WRS_EXPECTED_RELEASE_CANDIDATE/)
  assert.match(workflow, /inputs\.release_candidate_sha/)
})

test('human sign-off gates require named approval evidence', () => {
  const matrix = loadEvidence(matrixPath)
  const gates = matrix.gates.map(passGate)
  const target = gates.find((gate) => gate.id === 'legal-privacy-compliance')
  delete target.approvedBy
  const result = decision({ ...matrix, gates })
  assert.equal(result.decision, 'NO_GO')
  assert.ok(result.issues.some((issue) => issue.includes('approvedBy')))
})

test('all deployed staging evidence attests the frozen candidate', () => {
  const probe = fs.readFileSync('scripts/plan11/staging-probe.mjs', 'utf8')
  assert.match(probe, /https:\\/\\//)
  assert.match(probe, /matrix\.releaseCandidate/)
  assert.match(probe, /\/api\/health/)
  for (const header of [
    'content-security-policy',
    'strict-transport-security',
    'x-content-type-options',
    'referrer-policy',
  ]) {
    assert.match(probe, new RegExp(header))
  }

  const browser = fs.readFileSync('tests/e2e/staging-public.spec.js', 'utf8')
  assert.match(browser, /EVIDENCE_MATRIX\.json/)
  assert.match(browser, /\/api\/health/)
  assert.match(browser, /releaseCandidate/)

  const vitals = fs.readFileSync('scripts/plan11/staging-lab-vitals.mjs', 'utf8')
  assert.match(vitals, /EVIDENCE_MATRIX\.json/)
  assert.match(vitals, /\/api\/health/)
  assert.match(vitals, /releaseCandidate/)
})

test('Playwright isolates deployed staging tests from normal local E2E', () => {
  const source = fs.readFileSync('playwright.config.js', 'utf8')
  assert.match(source, /WRS_E2E_BASE_URL/)
  assert.match(source, /externalBaseURL/)
  assert.match(source, /webServer:\s*externalBaseURL/)
  assert.match(source, /\? undefined/)
  assert.match(source, /testIgnore/)
  assert.match(source, /staging-public\.spec\.js/)
})

test('payment activation tools refuse live-key probes and production pins Paystack to its official API origin', () => {
  const probe = fs.readFileSync('scripts/plan11/paystack-sandbox-probe.mjs', 'utf8')
  const provider = fs.readFileSync('api/_lib/paystack.js', 'utf8')
  assert.match(probe, /sk_test_/)
  assert.match(probe, /refuses non-test keys/i)
  assert.match(provider, /OFFICIAL_PAYSTACK_ORIGIN/)
  assert.match(provider, /VITE_WRS_MODE/)
  assert.match(provider, /production/i)
})

test('payout activation has a test-key-only Paystack transfer drill and never requires a live key', () => {
  const probe = fs.readFileSync('scripts/plan11/paystack-payout-probe.mjs', 'utf8')
  const workflow = fs.readFileSync('.github/workflows/plan11-live-activation-gate.yml', 'utf8')
  assert.match(probe, /sk_test_/)
  assert.match(probe, /0000000000/)
  assert.match(probe, /057/)
  assert.match(probe, /\/transferrecipient/)
  assert.match(probe, /\/transfer/)
  assert.match(probe, /\/transfer\/verify\//)
  assert.match(probe, /domain/)
  assert.match(workflow, /paystack-payout-test-mode/)
  assert.doesNotMatch(workflow, /PAYSTACK_LIVE_SECRET_KEY/)
})
