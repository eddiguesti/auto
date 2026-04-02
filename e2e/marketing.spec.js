import { test, expect } from '@playwright/test'

test.describe('Marketing Pages', () => {
  test('pricing page shows plans with prices', async ({ page }) => {
    await page.goto('/pricing')
    // Should mention a price
    const text = await page.textContent('body')
    expect(text).toMatch(/\u00a3|price|plan|month|year|free/i)
  })

  test('FAQ page shows questions', async ({ page }) => {
    await page.goto('/faq')
    const text = await page.textContent('body')
    // Should have question-like content
    expect(text).toMatch(/\?|question|answer|how|what|why/i)
  })

  test('about page renders with content', async ({ page }) => {
    await page.goto('/about')
    const text = await page.textContent('body')
    expect(text.length).toBeGreaterThan(100)
  })

  test('landing page renders hero section', async ({ page }) => {
    await page.goto('/')
    // Wait for main content to load
    await page.waitForLoadState('domcontentloaded')
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible({ timeout: 10000 })
  })
})
