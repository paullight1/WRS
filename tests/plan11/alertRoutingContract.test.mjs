import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('alert-routing activation requires a real incident acknowledgement loop', () => {
  const source = fs.readFileSync('scripts/plan11/alert-routing-drill.mjs', 'utf8')
  for (const marker of [
    'WRS_ALERT_DRILL_URL',
    'WRS_ALERT_DRILL_SECRET',
    'WRS_ALERT_MAX_ACK_SECONDS',
    'incidentId',
    'statusUrl',
    'acknowledged',
    'responder',
    'acknowledgedAt',
    'escalationOwner',
    'requestId',
    'synthetic',
  ]) {
    assert.match(source, new RegExp(marker))
  }
  assert.match(source, /https:/)
  assert.match(source, /poll/i)
  assert.match(source, /ackLatencySeconds/)
})

test('alert drill is workflow-dispatch only and uses scoped monitoring secrets', () => {
  const workflow = fs.readFileSync('.github/workflows/plan11-live-activation-gate.yml', 'utf8')
  assert.match(workflow, /run_alert_drill/)
  assert.match(workflow, /alert-routing-drill/)
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/)
  assert.match(workflow, /secrets\.WRS_ALERT_DRILL_URL/)
  assert.match(workflow, /secrets\.WRS_ALERT_DRILL_SECRET/)
  assert.match(workflow, /plan11-alert-routing/)
})
