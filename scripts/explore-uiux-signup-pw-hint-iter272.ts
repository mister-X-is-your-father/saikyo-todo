/**
 * Phase 6.15 loop iter 272 — signup password hint の semantic 分離 探索。
 *
 * 現状:
 *   <Label htmlFor="password">パスワード (8 文字以上)</Label>
 *   <IMEInput aria-describedby={errors ? 'signup-password-error' : undefined}>
 *
 * 「(8 文字以上)」が Label テキストに inline で含まれている。SR は input
 * に focus すると label を読み上げて "パスワード 8 文字以上" と announce、
 * 動作上は OK だが:
 *   - Label そのものが「フィールド名」 + 「ヒント」の混合になり、UI 上で
 *     再利用しにくい
 *   - aria-describedby を err 時のみセットしているので、エラー無し時は SR
 *     は label を再聴取する必要がある
 *
 * 期待 (fix 後):
 *   - Label は「パスワード」のみ
 *   - 別 <p id="signup-password-hint" class="text-muted-foreground text-xs">
 *     8 文字以上 </p> を追加
 *   - aria-describedby は常に hint id を含み、error 時はそれに加えて
 *     'signup-password-error' を append
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-signup-pw-hint-iter272.ts
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

  try {
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' })
    const labelText = (await page.locator('label[for="password"]').textContent())?.trim()
    findings.push({
      level: 'info',
      message: `/signup: password label text=${JSON.stringify(labelText)}`,
    })
    if (labelText !== 'パスワード') {
      findings.push({
        level: 'warning',
        message: `/signup: password Label が "パスワード" 単独でなく「(8 文字以上)」が混じる — ヒントを別 element に分離推奨`,
      })
    }
    const hintCount = await page.locator('#signup-password-hint').count()
    findings.push({ level: 'info', message: `/signup: signup-password-hint 個数=${hintCount}` })
    if (hintCount === 0) {
      findings.push({
        level: 'warning',
        message: `/signup: 別 <p id="signup-password-hint"> 不在 — hint と label を semantic 分離できていない`,
      })
    }
    const aria = await page.locator('input#password').getAttribute('aria-describedby')
    findings.push({ level: 'info', message: `/signup: password aria-describedby=${aria}` })
    if (!aria?.includes('signup-password-hint')) {
      findings.push({
        level: 'warning',
        message: `/signup: password aria-describedby が hint id を含まない — SR が hint を読まない`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (signup-pw-hint-iter272) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
