/**
 * Phase 6.15 loop iter1088: mock-timesheet login form の tsPassword に hint 紐付け regression guard。
 *
 * iter1088 で発見した bug: tsEmail には id="tsEmail-hint" + aria-describedby 紐付け (iter738) があるが
 * tsPassword には hint が無く、SR / sighted で hint signal が非対称だった (sighted user は seed
 * credential を form footer で見えるが、SR は input focus 時に hint を読まないので「何を入力すべきか」
 * の context が届かない)。
 *
 * 修正 (mock-login-form.tsx): tsPassword-hint paragraph を追加 (tsEmail-hint と同 pattern) +
 * tsPassword aria-describedby を 'tsPassword-hint' (errors 時は 'tsPassword-hint tsPassword-error')
 * に拡張。
 *
 * 本 script は mock-login で tsPassword の aria-describedby + tsPassword-hint の存在 + 内容を assert。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-timesheet-login-password-hint-iter1088.ts
 * 前提: pnpm dev port 3001 起動済
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3001'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/mock-timesheet/login`, { waitUntil: 'networkidle' })

  // tsPassword の aria-describedby 確認 (default state)
  const pwAria = await page.locator('input#tsPassword').getAttribute('aria-describedby')
  console.log(`tsPassword aria-describedby: ${pwAria}`)
  if (pwAria !== 'tsPassword-hint') {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tsPassword aria-describedby が "tsPassword-hint" でない (現在: "${pwAria}")`,
    })
  }

  // tsPassword-hint paragraph の存在 + 内容
  const hint = await page.locator('p#tsPassword-hint')
  const hintCount = await hint.count()
  console.log(`tsPassword-hint count: ${hintCount}`)
  if (hintCount === 0) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tsPassword-hint paragraph が存在しない`,
    })
  } else {
    const text = (await hint.innerText()).trim()
    console.log(`tsPassword-hint text: "${text}"`)
    if (!text.includes('password')) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `tsPassword-hint text に "password" が含まれない (mental model 不一致): "${text}"`,
      })
    }
    if (!text.includes('seed')) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `tsPassword-hint text に "seed" が含まれない (footer 参照誘導なし): "${text}"`,
      })
    }
  }

  // 対称性: tsEmail-hint も存在することを確認 (regression 防止)
  const emailHintCount = await page.locator('p#tsEmail-hint').count()
  console.log(`tsEmail-hint count: ${emailHintCount}`)
  if (emailHintCount === 0) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tsEmail-hint が消失 (regression、対称性失う)`,
    })
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — mock-timesheet login の tsPassword に hint 紐付け確立')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
