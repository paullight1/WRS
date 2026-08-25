import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('Phase 11.9 evidence template is fail closed by default', async () => {
  const evidence = JSON.parse(await text('Docs/production-readiness/11-live-activation/LIVE_EVIDENCE.example.json'))
  assert.equal(evidence.decision, 'NO-GO')
  assert.equal(evidence.openP0, 0)
  assert.equal(evidence.openP1, 0)
  assert.ok(Object.values(evidence.gates).some((gate) => gate.status === 'EXTERNAL BLOCKER'))
})

test('Phase 11.9 evaluator rejects the example evidence package', () => {
  const script = resolve(process.cwd(), 'scripts/evaluate-live-go.mjs')
  const evidence = resolve(process.cwd(), 'Docs/production-readiness/11-live-activation/LIVE_EVIDENCE.example.json')
  const result = spawnSync(process.execPath, [script, evidence], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(`${result.stdout}\n${result.stderr}`, /NO-GO/)
})

test('Phase 11.9 evaluator requires all live gates and evidence references', async () => {
  const source = await text('scripts/evaluate-live-go.mjs')
  for (const gate of [
    'infrastructure',
    'governance',
    'payments',
    'sensitiveData',
    'observability',
    'staging',
    'recovery',
    'humanReview',
  ]) {
    assert.match(source, new RegExp(gate))
  }
  assert.match(source, /openP0/)
  assert.match(source, /openP1/)
  assert.match(source, /evidence/)
  assert.match(source, /NO-GO/)
  assert.match(source, /GO/)
})

test('Phase 11.9 includes a manual final GO workflow and read-only final SQL', async () => {
  const workflow = await text('.github/workflows/plan11-final-go.yml')
  assert.match(workflow, /workflow_dispatch/)
  assert.match(workflow, /evaluate-live-go/)
  assert.match(workflow, /evidence_path/)

  const sql = await text('supabase/verification/plan11_final_go_checks.sql')
  assert.match(sql, /transaction read only/i)
  assert.match(sql, /ledger_entries/)
  assert.match(sql, /data_deletion_requests/)
  assert.match(sql, /account_deletion_requests/)
  assert.match(sql, /financial_reconciliations/)
  assert.match(sql, /storage\.buckets/)
  assert.match(sql, /FINAL database GO verification PASS/)
})
