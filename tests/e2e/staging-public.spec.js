import { expect, test } from '@playwright/test'

const routes = ['/', '/app', '/login', '/register']

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
