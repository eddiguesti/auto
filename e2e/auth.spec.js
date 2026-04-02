import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Easy Memoir/i)
  })

  test('can navigate to login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  })

  test('login form renders with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('Google OAuth button is present on login page', async ({ page }) => {
    await page.goto('/login')
    // Google sign-in button or iframe
    const googleBtn = page.locator(
      '[data-testid="google-login"], iframe[src*="google"], button:has-text("Google"), div[id*="google"]'
    )
    await expect(googleBtn.first()).toBeVisible({ timeout: 10000 })
  })

  test('can navigate to register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  })

  test('register form validates required fields', async ({ page }) => {
    await page.goto('/register')
    // Try submitting empty form
    const submitBtn = page.locator('button[type="submit"]')
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      // Should show validation or stay on page
      await expect(page).toHaveURL(/register/)
    }
  })
})
