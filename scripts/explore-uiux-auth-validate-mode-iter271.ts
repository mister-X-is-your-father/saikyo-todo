/**
 * Phase 6.15 loop iter 271 — login / signup form の RHF validation mode 探索。
 *
 * 現状: `useForm<LoginInput>({ resolver: zodResolver(...) })` で mode 指定無し
 * → RHF default は 'onSubmit'。validation は submit したときだけ走り、ユーザは
 * 「正しいメールアドレスを入力してください」エラーを email field 離脱時に
 * 受け取れない。submit して初めて inline error が現れる遅さ。
 *
 * 期待 (fix 後):
 *   mode='onTouched' → 各 field を最初に blur した後 (= 一度フォーカスを
 *   失った時) に validation 開始、以降は値が変わるたびに継続的に評価。
 *   ユーザは type → blur → 即時 validation feedback、submit 前に修正可能。
 *
 * 検証: dev で操作可能なので /login email field に "abc" を入力して blur、
 * 即座に inline error が出るか観察。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-validate-mode-iter271.ts
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

  async function audit(path: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    // email を invalid に埋めて、別 field に blur
    await page.locator('input#email').fill('invalid-email')
    await page.locator('input#password').focus() // blur email
    await page.waitForTimeout(300)
    // email-error が出るか
    const errSelector = path === '/signup' ? '#signup-email-error' : '#email-error'
    const visible = await page
      .locator(errSelector)
      .isVisible()
      .catch(() => false)
    findings.push({
      level: 'info',
      message: `${path}: blur 後に email-error visible=${visible} (期待: true)`,
    })
    if (!visible) {
      findings.push({
        level: 'warning',
        message: `${path}: validation が onSubmit のみ — blur 後に inline error が出ない、submit するまで feedback 無し`,
      })
    }
  }

  try {
    await audit('/login')
    await audit('/signup')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-validate-mode-iter271) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
