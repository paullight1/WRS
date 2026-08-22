import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const workflow = fs.readFileSync(new URL('../../.github/workflows/quality-gate.yml', import.meta.url), 'utf8')

for (const command of [
  'npm ci',
  'npm run lint',
  'npm run typecheck',
  'npm run format:check',
  'npm run test:unit',
  'npm run test:integration',
  'npm run test:e2e',
  'npm run build',
  'npm run audit',
]) {
  test(`quality gate runs ${command}`, () => {
    assert.ok(workflow.includes(command), `missing CI command: ${command}`)
  })
}

test('CI uploads browser evidence on failure', () => {
  assert.match(workflow, /upload-artifact/i)
  assert.match(workflow, /playwright-report|test-results/i)
})

test('CI uses a supported Node LTS rather than deprecated Node 20', () => {
  assert.doesNotMatch(workflow, /node-version:\s*20\b/)
  assert.match(workflow, /node-version:\s*(22|24)\b/)
})
