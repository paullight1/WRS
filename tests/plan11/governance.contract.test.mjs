import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('Phase 11.2 requires explicit code ownership', async () => {
  const owners = await text('.github/CODEOWNERS')
  assert.match(owners, /^\*\s+@paullight1/m)
  assert.match(owners, /supabase\/migrations/)
  assert.match(owners, /\.github\/workflows/)
  assert.match(owners, /api\//)
})

test('Phase 11.2 production release checklist names mandatory gates', async () => {
  const checklist = await text('Docs/releases/PRODUCTION_RELEASE_CHECKLIST.md')
  for (const required of [
    'WRS Quality Gate',
    'Plan 10 Security and Launch Gate',
    'Plan 10 Recovery Gate',
    'Plans 3-4 Database Gate',
    'Plan 5 Financial Database Gate',
    'Plan 6 Privacy Database Gate',
    'Plan 7 Deployment Database Gate',
    'Plan 8 Ecosystem Database Gate',
    'Plan 9 Account Operations Database Gate',
    'Plan 11',
  ]) {
    assert.match(checklist, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(checklist, /two-person|second reviewer|independent reviewer/i)
  assert.match(checklist, /rollback/i)
  assert.match(checklist, /NO-GO/i)
})

test('Phase 11.2 records branch protection as a fail-closed external gate', async () => {
  const phase = await text('Docs/production-readiness/11-live-activation/PHASE-11.2-GOVERNANCE.md')
  assert.match(phase, /branch protection/i)
  assert.match(phase, /required checks/i)
  assert.match(phase, /EXTERNAL BLOCKER/)
  assert.match(phase, /main/)
  assert.match(phase, /direct push/i)
})
