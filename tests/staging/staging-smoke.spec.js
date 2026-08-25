import { expect, test } from '@playwright/test'

const email = String(process.env.WRS_STAGING_EMAIL || '').trim()
const password = String(process.env.WRS_STAGING_PASSWORD || '')

if (!email || !password) {
  throw new Error('WRS_STAGING_EMAIL and WRS_STAGING_PASSWORD are required for remote staging validation.')
}

test('deployed staging exposes WRS and anonymous authoritative session state', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')
  await expect(page.locator('body')).not.toBeEmpty()

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /World Robotic System/i })).toBeVisible()
  await expect(page.getByText(/Login to your account/i)).toBeVisible()

  const sessionResponse = await page.request.get('/api/auth/session')
  expect(sessionResponse.ok()).toBeTruthy()
  expect(await sessionResponse.json()).toEqual(expect.objectContaining({ session: null }))

  await page.goto('/wallet')
  await expect(page).toHaveURL(/\/login(?:\?|$)/)
  expect(pageErrors).toEqual([])
})

test('verified synthetic staging account authenticates against deployed authority', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/login')
  await page.getByPlaceholder('Email or Phone Number').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: /log in|login/i }).click()
  await expect(page).toHaveURL(/\/home$/)

  const sessionResponse = await page.request.get('/api/auth/session')
  expect(sessionResponse.ok()).toBeTruthy()
  const envelope = await sessionResponse.json()
  expect(envelope.session).toEqual(
    expect.objectContaining({
      emailVerified: true,
      phoneVerified: true,
    }),
  )

  await page.goto('/wallet')
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.getByText(/Demo data · illustrative only/i)).toHaveCount(0)

  expect(pageErrors).toEqual([])
})
