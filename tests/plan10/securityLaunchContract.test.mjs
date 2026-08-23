import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../..', import.meta.url)
const exists = (path) => fs.existsSync(new URL(path, root))
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8')

const required = [
  'Docs/security/THREAT_MODEL.md',
  'Docs/operations/SLOS.md',
  'Docs/operations/INCIDENT_RUNBOOK.md',
  'Docs/operations/BACKUP_RESTORE.md',
  'Docs/releases/RELEASE_FLOW.md',
  'Docs/production-readiness/10-security-launch/LAUNCH_DECISION.md',
  'api/_lib/security.js',
  'api/_lib/telemetry.js',
  'scripts/check-secrets.mjs',
  'scripts/check-bundle-budget.mjs',
  'performance-budgets.json',
  'vercel.json',
  '.github/dependabot.yml',
  '.github/workflows/plan10-security-gate.yml',
  'tests/e2e/accessibility.spec.js',
  'tests/integration/resilience.test.ts',
]

test('Plan 10 security, reliability and release evidence boundaries exist', () => {
  for (const path of required) assert.ok(exists(path), `missing ${path}`)
})

test('threat model maps critical WRS abuse cases to preventive, detective and recovery controls with owners', () => {
  const source = read('Docs/security/THREAT_MODEL.md')
  for (const term of [
    'account takeover',
    'payment',
    'withdrawal',
    'IDOR',
    'malicious upload',
    'data poisoning',
    'admin compromise',
    'P0',
    'P1',
    'Preventive',
    'Detective',
    'Recovery',
    'Owner',
  ]) {
    assert.match(source, new RegExp(term, 'i'), term)
  }
})

test('API security is centralized around request identity, safe logging, content limits and same-origin mutation controls', () => {
  const security = read('api/_lib/security.js')
  const http = read('api/_lib/http.js')
  assert.match(security, /requestId|correlation/i)
  assert.match(security, /redact/i)
  assert.match(security, /content-type/i)
  assert.match(security, /maxBytes|request size|content-length/i)
  assert.match(http, /assertSameOrigin/)
  assert.match(http, /readJson/)
})

test('production browser responses define CSP, HSTS, anti-sniffing, referrer, permissions and clickjacking policy', () => {
  const vercel = read('vercel.json')
  for (const header of [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
  ]) {
    assert.match(vercel, new RegExp(header, 'i'), header)
  }
  assert.match(vercel, /frame-ancestors/i)
  assert.match(vercel, /camera=\(self\)|camera=\(\)/i)
  assert.match(vercel, /microphone=\(self\)|microphone=\(\)/i)
})

test('supply-chain gate checks deterministic install, dependency audit and repository secret leakage', () => {
  const workflow = read('.github/workflows/plan10-security-gate.yml')
  const dependabot = read('.github/dependabot.yml')
  const pkg = JSON.parse(read('package.json'))
  assert.match(workflow, /npm ci/)
  assert.match(workflow, /npm run audit/)
  assert.match(workflow, /check:secrets/)
  assert.match(dependabot, /npm/)
  assert.match(pkg.scripts['check:secrets'] || '', /check-secrets/)
})

test('observability uses correlation IDs and redacts secret, identity, finance and biometric fields', () => {
  const telemetry = read('api/_lib/telemetry.js')
  const slos = read('Docs/operations/SLOS.md')
  const runbook = read('Docs/operations/INCIDENT_RUNBOOK.md')
  assert.match(telemetry, /requestId|correlation/i)
  assert.match(telemetry, /redact/i)
  assert.match(telemetry, /password|token/i)
  assert.match(telemetry, /email|phone/i)
  assert.match(telemetry, /amount|financial|wallet/i)
  assert.match(telemetry, /biometric|voice|face/i)
  assert.match(slos, /auth|payment|wallet|upload|deployment/i)
  assert.match(runbook, /owner|escalation|severity/i)
})

test('performance budgets and accessibility automation are part of executable CI', () => {
  const budgets = JSON.parse(read('performance-budgets.json'))
  const pkg = JSON.parse(read('package.json'))
  const a11y = read('tests/e2e/accessibility.spec.js')
  assert.ok(Number(budgets?.bundle?.maxInitialJsKb) > 0)
  assert.ok(Number(budgets?.webVitals?.lcpMs) > 0)
  assert.match(pkg.scripts['check:bundle-budget'] || '', /check-bundle-budget/)
  assert.ok(pkg.devDependencies?.['@axe-core/playwright'])
  assert.match(a11y, /AxeBuilder|axe/i)
  assert.match(a11y, /keyboard|focus/i)
})

test('resilience suite exercises timeout, upstream outage and retry-safe failure without inventing success', () => {
  const source = read('tests/integration/resilience.test.ts')
  assert.match(source, /timeout/i)
  assert.match(source, /503|502|upstream|outage/i)
  assert.match(source, /retry|idempot/i)
  assert.match(source, /fail.closed|fail-closed|success/i)
})

test('release flow separates environments, requires staging evidence and documents rollback plus recovery', () => {
  const release = read('Docs/releases/RELEASE_FLOW.md')
  const backup = read('Docs/operations/BACKUP_RESTORE.md')
  for (const term of ['development', 'preview', 'staging', 'production', 'rollback', 'migration']) {
    assert.match(release, new RegExp(term, 'i'), term)
  }
  assert.match(release, /synthetic/i)
  assert.match(release, /separate.*credential|credential.*separate/is)
  assert.match(backup, /restore|recovery/i)
  assert.match(backup, /test|exercise/i)
})

test('launch decision is fail-closed and records external blockers rather than waiving missing live evidence', () => {
  const decision = read('Docs/production-readiness/10-security-launch/LAUNCH_DECISION.md')
  assert.match(decision, /PASS/)
  assert.match(decision, /FAIL/)
  assert.match(decision, /EXTERNAL BLOCKER/)
  assert.match(decision, /NO-GO|NO GO/i)
  assert.match(decision, /payment.*sandbox|sandbox.*payment/is)
  assert.match(decision, /backup|restore/i)
  assert.match(decision, /legal|privacy|compliance/i)
  assert.match(decision, /alert|observability/i)
  assert.match(decision, /staging/i)
})
