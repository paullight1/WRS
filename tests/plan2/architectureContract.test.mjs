import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')
const exists = (path) => fs.existsSync(new URL(path, root))

const REQUIRED = [
  'src/domain/README.md',
  'src/services/README.md',
  'src/infrastructure/README.md',
  'tests/unit/README.md',
  'tests/integration/README.md',
  'tests/e2e/README.md',
  'Docs/architecture/README.md',
  'Docs/security/README.md',
  'Docs/runbooks/README.md',
  'CONTRIBUTING.md',
]

test('production-oriented repository boundaries are explicit', () => {
  for (const path of REQUIRED) assert.ok(exists(path), `missing ${path}`)
})

test('architecture documents UI/domain/service/infrastructure ownership', () => {
  const architecture = read('Docs/architecture/README.md')
  for (const boundary of ['UI', 'domain', 'service', 'infrastructure']) {
    assert.match(architecture, new RegExp(boundary, 'i'), `architecture missing ${boundary} boundary`)
  }
  assert.match(architecture, /backend/i)
  assert.match(architecture, /environment/i)
})

test('contributor guide defines test placement and production evidence', () => {
  const guide = read('CONTRIBUTING.md')
  assert.match(guide, /unit/i)
  assert.match(guide, /integration/i)
  assert.match(guide, /e2e|playwright/i)
  assert.match(guide, /production|verification/i)
})
