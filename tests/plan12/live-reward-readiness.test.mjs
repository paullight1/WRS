import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('daily login XP refreshes authoritative balances without blocking member snapshots', () => {
  const home = read('src/screens/Home.jsx')
  const api = read('server/routes/rewards/activity.js')
  const client = read('src/infrastructure/mining/browserMiningClient.ts')
  assert.match(home, /claimDailyActivity\(\)/)
  assert.match(home, /const miningRequest = browserMiningClient\.snapshot\(\)/)
  assert.match(home, /if \(!claim\.refreshed\)/)
  assert.match(home, /setRefreshCount\(\(count\) => count \+ 1\)/)
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
  assert.match(api, /p_worksite_id:\s*worksiteId/)
  assert.match(api, /if \(!current\.eligibility\.eligible\) return current/)
})

test('unpublished tasks and notification records are not represented by local mock data', () => {
  const submit = read('server/routes/data/tasks/submit.js')
  const data = read('src/screens/DataContribution.jsx')
  const task = read('src/screens/DataTask.jsx')
  const notifications = read('src/screens/Notifications.jsx')
  assert.match(submit, /requireSession\(request, \{ verified: true \}\)/)
  assert.match(submit, /wrs_submit_data_task_response/)
  assert.match(submit, /taskSlug\.length < 2 \|\| !response/)
  assert.match(task, /if \(runtimeConfig\.isDemo\) return <DemoTask task=\{task\} \/>/)
  assert.match(task, /browserDataClient\.submitTask\(slug/)
  for (const [path, source] of [
    ['DataContribution', data],
    ['Notifications', notifications],
  ]) {
    assert.doesNotMatch(source, /data\/mock\.js/, `${path} imports sample records`)
  }
})
