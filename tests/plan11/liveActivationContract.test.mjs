import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { decision, loadEvidence, REQUIRED_GATES } from '../../scripts/plan11/evidence.mjs'

const matrixPath = 'Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json'

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

test('GO requires every required gate to be PASS', () => {
  const matrix = loadEvidence(matrixPath)
  const allPass = { ...matrix, gates: matrix.gates.map((gate) => ({ ...gate, status: 'PASS' })) }
  assert.equal(decision(allPass).decision, 'GO')
  const oneBlocked = {
    ...allPass,
    gates: allPass.gates.map((gate, index) => (index === 0 ? { ...gate, status: 'EXTERNAL_BLOCKER' } : gate)),
  }
  assert.equal(decision(oneBlocked).decision, 'NO_GO')
})

test('staging probe is HTTPS-only and checks production browser security headers', () => {
  const source = fs.readFileSync('scripts/plan11/staging-probe.mjs', 'utf8')
  assert.match(source, /https:\\\/\\\//)
  for (const header of [
    'content-security-policy',
    'strict-transport-security',
    'x-content-type-options',
    'referrer-policy',
  ])
    assert.match(source, new RegExp(header))
})
