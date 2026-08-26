import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = new URL('../..', import.meta.url)

const runBuild = (extraEnv = {}) =>
  spawnSync('npm', ['run', 'build'], {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
    timeout: 120000,
  })

test('default demo configuration produces a production bundle', () => {
  const result = runBuild({ VITE_WRS_MODE: 'demo' })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stdout, /built in|vite v/i)

  const assetsDir = fileURLToPath(new URL('../../dist/assets/', import.meta.url))
  const javascript = fs
    .readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8'))
    .join('\n')
  assert.doesNotMatch(javascript, /jsxDEV|react-jsx-dev-runtime/, 'production output contains React development code')
  assert.doesNotMatch(javascript, /\/src\//, 'production output contains absolute source paths')
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
