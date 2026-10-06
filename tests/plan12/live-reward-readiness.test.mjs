import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('daily login XP is requested before the authoritative member snapshot', () => {
  const home = read('src/screens/Home.jsx')
  const api = read('server/routes/rewards/activity.js')
  const client = read('src/infrastructure/mining/browserMiningClient.ts')
  assert.match(home, /claimDailyActivity\(\)/)
  assert.match(home, /dailyActivity\.then\(\(\) => browserMiningClient\.snapshot\(\)\)/)
  assert.match(client, /\/api\/rewards\/activity/)
  assert.match(api, /requireSession\(request, \{ verified: true \}\)/)
  assert.match(api, /wrs_award_member_milestones/)
})

test('mining never starts without enabled issuance and explains the disabled start button', () => {
  const screen = read('src/screens/MiningProduction.jsx')
  const api = read('api/_lib/mining.js')
  assert.match(screen, /snapshot\.issuanceEnabled/)
  assert.match(screen, /Mining is disabled until an authorized operator activates a reward rule/)
  assert.match(api, /wrs_start_mining_session/)
  assert.match(api, /p_worksite_id: null/)
})

test('unpublished tasks and notification records are not represented by local mock data', () => {
  const submit = read('server/routes/data/tasks/submit.js')
  const data = read('src/screens/DataContribution.jsx')
  const task = read('src/screens/DataTask.jsx')
  const notifications = read('src/screens/Notifications.jsx')
  assert.match(submit, /if \(!trainingTask\)/)
  assert.match(submit, /task-not-published/)
  for (const [path, source] of [
    ['DataContribution', data],
    ['DataTask', task],
    ['Notifications', notifications],
  ]) {
    assert.doesNotMatch(source, /data\/mock\.js/, `${path} imports sample records`)
  }
})
