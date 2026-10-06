import { expect, test } from '@playwright/test'

const operatorSession = {
  userId: 'operator-01',
  status: 'active',
  emailVerified: true,
  phoneVerified: true,
  roles: ['support_operator'],
  expiresAt: '2099-01-01T00:00:00.000Z',
  accountDeletionPending: false,
  mfaEnabled: false,
  mfaSatisfiedAt: null,
}

async function prepareOperator(page, roles = ['support_operator']) {
  await page.addInitScript(() => localStorage.clear())
  await page.route('**/api/auth/session', (route) => route.fulfill({ json: { session: { ...operatorSession, roles } } }))
  await page.route('**/api/admin/operations*', (route) => {
    const url = new URL(route.request().url())
    const scope = url.searchParams.get('scope') || 'overview'
    const data = scope === 'users'
      ? { users: [{ id: 'user-record-01', user_id: 'member-01', status: 'active', kyc_status: 'verified', country_code: 'NG', created_at: '2026-09-01T10:00:00.000Z' }] }
      : { support: [], audit: [], accountDeletions: [] }
    return route.fulfill({ json: { scope, ...data, nextCursor: null } })
  })
}

test('desktop theme toggle defaults light and persists dark separately', async ({ page }) => {
  await prepareOperator(page)
  await page.goto('/?scope=users')

  await expect(page.getByRole('heading', { name: 'Users & KYC' })).toBeVisible()
  await expect(page.locator('[data-admin-theme]')).toHaveAttribute('data-admin-theme', 'light')
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(page.locator('[data-admin-theme]')).toHaveAttribute('data-admin-theme', 'dark')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wrs-admin-theme'))).toBe('dark')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wrs-theme'))).toBeNull()
})

test('operator can open a record and see only an authorized contextual action', async ({ page }) => {
  await prepareOperator(page, ['kyc_operator'])
  await page.goto('/?scope=users')

  await page.getByRole('button', { name: 'Details' }).click()
  await expect(page.getByText('Selected record')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Action' })).toHaveValue('kyc.set')
  await expect(page.getByRole('option', { name: 'user.suspend' })).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'deployment.settle' })).toHaveCount(0)
})

test('mobile navigation opens as a menu and keeps role-scoped links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareOperator(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Open admin navigation' }).click()
  await expect(page.getByRole('navigation', { name: 'Operator scopes' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Users & KYC' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Finance' })).toHaveCount(0)
})
