import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('Phase 11.6 staging Playwright config has no localhost fallback', async () => {
  const config = await text('playwright.staging.config.js')
  assert.match(config, /WRS_STAGING_URL/)
  assert.match(config, /https:/i)
  assert.doesNotMatch(config, /localhost|127\.0\.0\.1/)
  assert.doesNotMatch(config, /webServer/)
})

test('Phase 11.6 manual workflow requires staging URL and synthetic account credentials', async () => {
  const workflow = await text('.github/workflows/plan11-staging-validation.yml')
  assert.match(workflow, /workflow_dispatch/)
  assert.match(workflow, /WRS_STAGING_URL/)
  assert.match(workflow, /WRS_STAGING_EMAIL/)
  assert.match(workflow, /WRS_STAGING_PASSWORD/)
  assert.match(workflow, /staging-http-preflight/)
  assert.match(workflow, /playwright\.staging\.config/)
  assert.doesNotMatch(workflow, /production/i)
})

test('Phase 11.6 remote smoke verifies anonymous authority and authenticated journey', async () => {
  const source = await text('tests/staging/staging-smoke.spec.js')
  assert.match(source, /api\/auth\/session/)
  assert.match(source, /World Robotic System/)
  assert.match(source, /WRS_STAGING_EMAIL/)
  assert.match(source, /WRS_STAGING_PASSWORD/)
  assert.match(source, /wallet|home/i)
  assert.match(source, /Demo data/i)
})

test('Phase 11.6 documents deployed staging evidence and external blocker status', async () => {
  const phase = await text('Docs/production-readiness/11-live-activation/PHASE-11.6-STAGING.md')
  assert.match(phase, /deployed staging/i)
  assert.match(phase, /Web Vitals|LCP/i)
  assert.match(phase, /EXTERNAL BLOCKER/)
  assert.match(phase, /synthetic/i)
})
