/**
 * Phase 6.15 loop iter 264 — login / signup form の noValidate 探索。
 *
 * 現状: `<input required>` だけで `<form>` に `noValidate` が無いため、
 * 空フィールドで submit すると **ブラウザ native の validation bubble**
 * が発火する (zod resolver より先に kick されることがある)。bubble の
 * 文言は OS / ブラウザ言語依存 (英語環境では "Please fill out this field")
 * で、しかもスタイル不能。本アプリは zod + RHF で日本語エラーメッセージを
 * inline に出す設計なので、native bubble はノイズ。
 *
 * 期待 (fix 後):
 *   form に `noValidate` を付ける。`required` 属性自体は維持 (aria-required
 *   と同じく SR が「必須」と読み上げるため)。これで native UI は出ず、
 *   既存の RHF + zod inline error と toast に一本化される。
 *
 * 検証: form[novalidate] を query して true を assert。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-novalidate-iter264.ts
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
    const form = page.locator('form').first()
    const novalidate = await form.getAttribute('novalidate')
    // novalidate は boolean attr。React の noValidate=true は novalidate=""
    findings.push({ level: 'info', message: `${path}: form novalidate=${novalidate}` })
    if (novalidate === null) {
      findings.push({
        level: 'warning',
        message: `${path}: form に noValidate 不在 — 空 submit 時にブラウザ native bubble (英語/スタイル不能) が発火し、zod の inline error と二重表示`,
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

  console.log(`\n=== Findings (auth-novalidate-iter264) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
