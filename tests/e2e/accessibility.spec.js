import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const criticalRoutes = ['/', '/app', '/login', '/register', '/home', '/more', '/support']

for (const route of criticalRoutes) {
  test(`no serious WCAG 2.1 AA violations on ${route}`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const highImpact = results.violations
      .filter((violation) => ['critical', 'serious'].includes(violation.impact || ''))
      .map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }))
    expect(highImpact).toEqual([])
  })
}

test('keyboard focus enters the login journey without pointer input', async ({ page }) => {
  await page.goto('/login')
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    visible: Boolean(document.activeElement && document.activeElement.getClientRects().length),
  }))
  expect(focused.tag).not.toBe('BODY')
  expect(focused.visible).toBe(true)
})
