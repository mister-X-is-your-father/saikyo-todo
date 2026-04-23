import { expect, test } from '@playwright/test'

test('home page renders', async ({ page }) => {
  await page.goto('/')
  // Next.js default page contains "Get started by editing" text
  await expect(page).toHaveTitle(/最強TODO/)
})
