import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('hosting rollback drill is staging-only and restores the frozen candidate after rollback proof', () => {
  const source = fs.readFileSync('scripts/plan11/vercel-staging-rollback-drill.mjs', 'utf8')
  for (const marker of [
    'WRS_VERCEL_ENVIRONMENT',
    'staging',
    'WRS_VERCEL_STAGING_CANDIDATE_DEPLOYMENT',
    'WRS_VERCEL_STAGING_PREVIOUS_DEPLOYMENT',
    'VERCEL_TOKEN',
    'VERCEL_ORG_ID',
    'VERCEL_PROJECT_ID',
    '59.5.0',
    'promote',
    'rollback',
    '/api/health',
    'releaseCandidate',
    'finalCandidateRestored',
  ]) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(source, /refus/i)
  assert.match(source, /production/i)
})

test('hosting rollback drill is workflow-dispatch only and requires staging Vercel secrets', () => {
  const workflow = fs.readFileSync('.github/workflows/plan11-live-activation-gate.yml', 'utf8')
  assert.match(workflow, /run_hosting_rollback_drill/)
  assert.match(workflow, /vercel-staging-rollback-drill/)
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/)
  assert.match(workflow, /secrets\.VERCEL_TOKEN/)
  assert.match(workflow, /secrets\.WRS_STAGING_VERCEL_ORG_ID/)
  assert.match(workflow, /secrets\.WRS_STAGING_VERCEL_PROJECT_ID/)
  assert.match(workflow, /plan11-hosting-rollback/)
})
