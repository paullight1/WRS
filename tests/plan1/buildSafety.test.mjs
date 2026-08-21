import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const runBuild = (extraEnv = {}) =>
  spawnSync('npm', ['run', 'build'], {
    cwd: new URL('../..', import.meta.url),
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
    timeout: 120000,
  })

test('default demo configuration produces a production bundle', () => {
  const result = runBuild({ VITE_WRS_MODE: 'demo' })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stdout, /built in|vite v/i)
})

test('unsafe production configuration fails closed at build time', () => {
  const result = runBuild({
    VITE_WRS_MODE: 'production',
    VITE_WRS_AUTHORITY_URL: '',
    VITE_WRS_PAYMENT_SERVICE: '',
    VITE_WRS_IDENTITY_SERVICE: '',
    VITE_WRS_ROBOT_SERVICE: '',
    VITE_WRS_DATA_SERVICE: '',
    VITE_WRS_REWARD_SERVICE: '',
    VITE_WRS_DEPLOYMENT_SERVICE: '',
    VITE_WRS_SUPPORT_SERVICE: '',
  })
  assert.notEqual(result.status, 0, 'unsafe production build unexpectedly succeeded')
  assert.match(`${result.stdout}\n${result.stderr}`, /Invalid production configuration/)
})
