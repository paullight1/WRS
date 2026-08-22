import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')
const exists = (path) => fs.existsSync(new URL(path, root))

const pkg = JSON.parse(read('package.json'))
const versionTuple = (value) => {
  const match = String(value || '').match(/(\d+)\.(\d+)\.(\d+)/)
  return match ? match.slice(1).map(Number) : [0, 0, 0]
}
const atLeast = (value, minimum) => {
  const actual = versionTuple(value)
  for (let i = 0; i < minimum.length; i += 1) {
    if (actual[i] > minimum[i]) return true
    if (actual[i] < minimum[i]) return false
  }
  return true
}

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
  '@htmlacademy/eslint-plugin-jsx-a11y',
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
  for (const path of [
    'eslint.config.js',
    '.prettierrc.json',
    'tsconfig.json',
    'vitest.config.js',
    'playwright.config.js',
  ])
    assert.ok(exists(path), `missing ${path}`)
})

test('quality baseline avoids the unsupported ESLint 9 line', () => {
  assert.ok(atLeast(pkg.devDependencies?.eslint, [10, 0, 0]), `expected ESLint 10+, got ${pkg.devDependencies?.eslint}`)
})

test('router baseline includes the July 2026 security patches', () => {
  assert.ok(
    atLeast(pkg.dependencies?.['react-router-dom'], [7, 18, 0]),
    `expected react-router-dom 7.18.0+, got ${pkg.dependencies?.['react-router-dom']}`,
  )
})

test('incremental legacy baseline policy is documented', () => {
  const doc = read('Docs/architecture/engineering-baseline.md')
  assert.match(doc, /legacy/i)
  assert.match(doc, /new production code/i)
  assert.match(doc, /lint|typecheck/i)
})
