import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('Phase 11.8 human review template covers all non-automatable launch domains', async () => {
  const review = await text('Docs/releases/HUMAN_LAUNCH_REVIEW.md')
  for (const topic of [
    'WCAG',
    'privacy',
    'biometric',
    'payment',
    'retention',
    'terms',
    'incident',
    'release owner',
    'rollback owner',
  ]) {
    assert.match(review, new RegExp(topic, 'i'))
  }
  assert.match(review, /PASS/)
  assert.match(review, /FAIL/)
  assert.match(review, /EXTERNAL BLOCKER/)
  assert.match(review, /evidence/i)
  assert.match(review, /reviewer/i)
})

test('Phase 11.8 remains fail closed until every required review is signed', async () => {
  const phase = await text('Docs/production-readiness/11-live-activation/PHASE-11.8-HUMAN-REVIEW.md')
  assert.match(phase, /no new (database |base )?migration/i)
  assert.match(phase, /manual/i)
  assert.match(phase, /EXTERNAL BLOCKER/)
  assert.match(phase, /all required/i)
  assert.match(phase, /NO-GO/i)
})
