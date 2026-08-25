import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('Phase 11.10 activation sequence preserves stacked PR and re-verification order', async () => {
  const sequence = await text('Docs/releases/LIVE_ACTIVATION_SEQUENCE.md')
  assert.match(sequence, /PR #7/)
  assert.match(sequence, /prod\/plans-05-10/)
  assert.match(sequence, /PR #3/)
  assert.match(sequence, /main/)
  assert.match(sequence, /re-?verify/i)
  assert.match(sequence, /expected head|head SHA/i)
  assert.match(sequence, /rollback/i)
  assert.match(sequence, /NO-GO/i)
})

test('Phase 11.10 cannot authorize merge while final live evidence is incomplete', async () => {
  const phase = await text('Docs/production-readiness/11-live-activation/PHASE-11.10-ACTIVATION.md')
  assert.match(phase, /no new (database |base )?migration/i)
  assert.match(phase, /do not merge/i)
  assert.match(phase, /NO-GO/)
  assert.match(phase, /LIVE_EVIDENCE\.json/)
  assert.match(phase, /plan11_final_go_checks\.sql/)
  assert.match(phase, /post-merge/i)
})
