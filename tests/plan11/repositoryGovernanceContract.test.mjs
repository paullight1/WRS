import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('repository governance probe verifies protection, reviews, admin enforcement and required release checks', () => {
  const source = fs.readFileSync('scripts/plan11/github-governance-probe.mjs', 'utf8')
  for (const marker of [
    'WRS_GITHUB_GOVERNANCE_TOKEN',
    '/branches/main',
    '/branches/main/protection',
    'protected',
    'required_status_checks',
    'required_pull_request_reviews',
    'required_approving_review_count',
    'enforce_admins',
    'allow_force_pushes',
    'allow_deletions',
    'static',
    'e2e',
    'security',
    'supply-chain-and-performance',
    'accessibility',
    'postgres-backup-restore',
  ]) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.doesNotMatch(source, /console\.log\([^)]*WRS_GITHUB_GOVERNANCE_TOKEN/)
})

test('repository governance verifier is workflow-dispatch only and uses a scoped read token', () => {
  const workflow = fs.readFileSync('.github/workflows/plan11-live-activation-gate.yml', 'utf8')
  assert.match(workflow, /run_repository_governance_probe/)
  assert.match(workflow, /repository-governance/)
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/)
  assert.match(workflow, /secrets\.WRS_GITHUB_GOVERNANCE_TOKEN/)
  assert.match(workflow, /plan11-repository-governance/)
})
