import fs from 'node:fs'
import { expect, test } from '@playwright/test'

const matrix = JSON.parse(
  fs.readFileSync('Docs/production-readiness/11-live-activation/EVIDENCE_MATRIX.json', 'utf8'),
)
const expectedRelease = String(matrix.releaseCandidate || '')
  .slice(0, 12)
  .toLowerCase()
const routes = ['/', '/app', '/login', '/register']

test('staging API health attests the frozen application candidate', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['cache-control']).toContain('no-store')
  const payload = await response.json()
  expect(payload.status).toBe('ok')
  expect(String(payload.release || '').toLowerCase()).toBe(expectedRelease)
})

for (const route of routes) {
  test(`staging ${route} has secure headers and no browser errors`, async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })

    const response = await page.goto(route, { waitUntil: 'networkidle' })
    expect(response?.ok()).toBeTruthy()
    expect(response?.url()).toMatch(/^https:\/\//)
    const headers = response?.headers() || {}
    expect(headers['content-security-policy']).toBeTruthy()
    expect(headers['strict-transport-security']).toBeTruthy()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBeTruthy()
    expect(errors).toEqual([])
  })
}

test('staging public registration journey is reachable from the app entry', async ({ page }) => {
  await page.goto('/app')
  await page
    .getByRole('link', { name: /get started|register|create/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('heading', { name: /create your wrs account/i })).toBeVisible()
})
