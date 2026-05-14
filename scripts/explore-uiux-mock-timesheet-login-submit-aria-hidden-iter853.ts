/**
 * Phase 6.15 loop iter853 — /mock-timesheet/login の submit button visible text を
 * aria-hidden span で wrap した regression guard。
 *
 * 背景: iter844 (login submit) / iter845 (signup submit) / iter851 (auth footer link) /
 * iter852 (offline recovery 2 control) で確立した pattern を mock-timesheet の login
 * surface にも展開し、auth-like 全 surface の visible aria-hidden 規約を統一する。
 *
 * mock-timesheet は Playwright 自動入力テスト対象の mock 外部システムで、ユーザが
 * brower で直接触ることもある (開発者 demo)。auth surface 規約適用は AT 整合性を
 * cross-surface で保つ意味で重要。
 *
 *   pnpm tsx scripts/explore-uiux-mock-timesheet-login-submit-aria-hidden-iter853.ts
 *
 * supabase / login 不要 (静的 page 直アクセスで verify 完結)。
 */
import { chromium } from '@playwright/test'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const BASE = 'http://localhost:3001'

async function main(): Promise<void> {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  try {
    await page.goto(`${BASE}/mock-timesheet/login`, { waitUntil: 'networkidle' })

    // 1. submit button が aria-label を保持しているか (idle 状態)
    const submit = page.locator('button#tsLoginSubmit[type="submit"]')
    if ((await submit.count()) !== 1) {
      findings.push({ level: 'error', message: 'submit button #tsLoginSubmit が見つからない' })
      await browser.close()
      console.log('=== Findings (mock-timesheet-login-submit-aria-hidden iter853) ===')
      for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
      process.exit(1)
    }

    const ariaLabel = await submit.getAttribute('aria-label')
    if (ariaLabel !== 'ログイン (mock-timesheet email + password で認証)') {
      findings.push({
        level: 'error',
        message: `submit aria-label "${ariaLabel}" 不一致`,
      })
    }

    // 2. submit button 内 aria-hidden span に visible "ログイン" がある (idle 状態)
    const span = submit.locator('span[aria-hidden="true"]', { hasText: 'ログイン' })
    if ((await span.count()) !== 1) {
      findings.push({
        level: 'error',
        message: 'submit button 内 <span aria-hidden="true">ログイン</span> が見つからない',
      })
    }

    // 3. target size 44px (h-11)
    const box = await submit.boundingBox()
    if (!box || box.height < 44) {
      findings.push({
        level: 'warning',
        message: `submit button 高さ ${box?.height ?? '?'}px < 44px (h-11 失効?)`,
      })
    }

    // 4. iter738 invariant: form の aria-label 健在
    const form = page.locator('form[aria-label="Mock Timesheet ログインフォーム"]')
    if ((await form.count()) !== 1) {
      findings.push({
        level: 'error',
        message: 'form aria-label="Mock Timesheet ログインフォーム" 健在性 NG',
      })
    }

    // 5. label-htmlFor invariant: email / password
    const emailLabel = page.locator('label[for="tsEmail"]', { hasText: 'メールアドレス' })
    const pwLabel = page.locator('label[for="tsPassword"]', { hasText: 'パスワード' })
    if ((await emailLabel.count()) !== 1 || (await pwLabel.count()) !== 1) {
      findings.push({ level: 'error', message: 'label htmlFor (tsEmail / tsPassword) 不一致' })
    }
  } finally {
    await browser.close()
  }

  console.log(`\n=== Findings (mock-timesheet-login-submit-aria-hidden iter853) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
