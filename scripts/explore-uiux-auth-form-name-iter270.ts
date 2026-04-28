/**
 * Phase 6.15 loop iter 270 — login / signup `<form>` の accessible name 探索。
 *
 * 現状: `<form>` 自体に `aria-labelledby` / `aria-label` 不在。Card region
 * が heading と紐付いているので SR が region 入境時には announce が出るが、
 * **form** という interactive container 自体は accessible name 無しの
 * "form, no name" となる。SR の form rotor / forms list (NVDA: Insert+F7)
 * で「ログイン」/「サインアップ」とリストされるべき場所が無名 form として
 * 出る。
 *
 * 期待 (fix 後):
 *   <form aria-labelledby="login-heading"> / "signup-heading"
 *   form の accessible name = heading text と一致、SR の form list に
 *   「ログイン」「サインアップ」として表示。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-form-name-iter270.ts
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

  page.on('pageerror', (e) => {
    findings.push({ level: 'error', message: `pageerror: ${e.message}`.slice(0, 240) })
  })

  async function audit(path: string, expectedHeadingId: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    const form = page.locator('form').first()
    const labelledBy = await form.getAttribute('aria-labelledby')
    const ariaLabel = await form.getAttribute('aria-label')
    findings.push({
      level: 'info',
      message: `${path}: form aria-labelledby=${labelledBy} aria-label=${ariaLabel}`,
    })
    if (labelledBy !== expectedHeadingId && !ariaLabel) {
      findings.push({
        level: 'warning',
        message: `${path}: form に accessible name 無し — SR の form list で無名 form として表示、見つけにくい`,
      })
    }
  }

  try {
    await audit('/login', 'login-heading')
    await audit('/signup', 'signup-heading')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-form-name-iter270) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
