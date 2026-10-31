import { expect, test } from '@playwright/test'

test.skip(!process.env.WRS_E2E_ADMIN_CROSS_ORIGIN, 'Run with the dedicated cross-origin admin server.')

test('standalone admin signs in using the configured shared API origin', async ({ page }) => {
  const origin = 'http://127.0.0.1:5188'
  const apiOrigin = 'https://www.worldroboticsystem.com'
  const session = {
    userId: '22222222-2222-4222-8222-222222222222',
    email: 'operator@wrs.test',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    roles: ['admin'],
    expiresAt: '2099-01-01T00:00:00.000Z',
    accountDeletionPending: false,
    mfaEnabled: true,
    mfaSatisfiedAt: new Date().toISOString(),
  }
  const calls = []
  await page.route(`${apiOrigin}/api/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    calls.push({ path: url.pathname, method: request.method(), origin: url.origin })
    if (url.pathname === '/api/auth/session') return route.fulfill({ headers, json: { session: null } })
    if (url.pathname === '/api/auth/login') return route.fulfill({ headers, json: { session, challenges: [] } })
    if (url.pathname === '/api/admin/operations')
      return route.fulfill({
        headers,
        json: { scope: 'overview', summary: { totals: [], recentUsers: [], metrics: [], issuance: null } },
      })
    return route.fulfill({ status: 404, headers, json: { message: 'Unexpected test request' } })
  })
  await page.goto('/login')
  await page.getByLabel('Email or phone').fill('operator@wrs.test')
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'At a glance' })).toBeVisible()
  expect(calls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: '/api/auth/session', origin: apiOrigin }),
      expect.objectContaining({ path: '/api/auth/login', method: 'POST', origin: apiOrigin }),
      expect.objectContaining({ path: '/api/admin/operations', origin: apiOrigin }),
    ]),
  )
})
