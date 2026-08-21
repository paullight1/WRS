import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')
const exists = (path) => fs.existsSync(new URL(path, root))

const pkg = JSON.parse(read('package.json'))

const REQUIRED_SCRIPTS = [
  'lint',
  'typecheck',
  'format:check',
  'test',
  'test:unit',
  'test:integration',
  'test:e2e',
  'build',
  'audit',
]

const REQUIRED_DEV_DEPS = [
  'eslint',
  'eslint-plugin-react-hooks',
  'eslint-plugin-jsx-a11y',
  'globals',
  'prettier',
  'typescript',
  'vitest',
  '@testing-library/react',
  '@testing-library/jest-dom',
  '@playwright/test',
]

test('package scripts expose every production quality gate', () => {
  for (const script of REQUIRED_SCRIPTS) assert.ok(pkg.scripts?.[script], `missing npm script: ${script}`)
})

test('tooling dependencies are explicit and lockfile-managed', () => {
  for (const dep of REQUIRED_DEV_DEPS) assert.ok(pkg.devDependencies?.[dep], `missing devDependency: ${dep}`)
  assert.ok(exists('package-lock.json'))
})

test('lint, format, typecheck and browser configs exist', () => {
  for (const path of ['eslint.config.js', '.prettierrc.json', 'tsconfig.json', 'vitest.config.js', 'playwright.config.js']) {
    assert.ok(exists(path), `missing ${path}`)
  }
})

test('incremental legacy baseline policy is documented', () => {
  const doc = read('Docs/architecture/engineering-baseline.md')
  assert.match(doc, /legacy/i)
  assert.match(doc, /new production code/i)
  assert.match(doc, /lint|typecheck/i)
})
