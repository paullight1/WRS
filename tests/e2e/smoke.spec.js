import { expect, test } from '@playwright/test'

const criticalRoutes = ['/', '/app', '/login', '/packages', '/wallet', '/deploy', '/settings']

for (const route of criticalRoutes) {
  test(`${route} renders without browser errors`, async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(route)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(errors).toEqual([])
  })
}

test('application surfaces clearly identify demo data', async ({ page }) => {
  await page.goto('/wallet')
  await expect(page.getByText(/Demo data · illustrative only/i)).toBeVisible()
})
