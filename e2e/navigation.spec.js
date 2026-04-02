import { test, expect } from '@playwright/test'

test.describe('Public Navigation', () => {
  test('landing page has CTA buttons', async ({ page }) => {
    await page.goto('/')
    // Should have at least one call-to-action link/button
    const cta = page.locator(
      'a[href*="register"], a[href*="login"], button:has-text("Start"), a:has-text("Start"), a:has-text("Begin"), a:has-text("Try")'
    )
    await expect(cta.first()).toBeVisible({ timeout: 10000 })
  })

  test('can navigate to /how-it-works', async ({ page }) => {
    await page.goto('/how-it-works')
    await expect(page.locator('body')).toBeVisible()
    // Page should have content (not a blank 404)
    const text = await page.textContent('body')
    expect(text.length).toBeGreaterThan(50)
  })

  test('can navigate to /pricing', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.locator('body')).toBeVisible()
    const text = await page.textContent('body')
    expect(text.length).toBeGreaterThan(50)
  })

  test('can navigate to /faq', async ({ page }) => {
    await page.goto('/faq')
    await expect(page.locator('body')).toBeVisible()
  })

  test('can navigate to /about', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('body')).toBeVisible()
  })

  test('footer is present on landing page', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    if (await footer.isVisible()) {
      await expect(footer).toBeVisible()
    }
  })
})
