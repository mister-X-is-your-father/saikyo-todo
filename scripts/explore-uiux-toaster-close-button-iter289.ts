/**
 * Phase 6.15 loop iter 289 — sonner Toaster の close button aria-label が
 * default で英語 "Close toast" のまま、JP locale 不一致な問題。
 *
 * 現状 (iter288 後): src/app/layout.tsx の Toaster は `containerAriaLabel="通知"`
 * で section 全体は localize 済み。しかし各 toast の close button (× アイコン)
 * の aria-label は sonner default `closeButtonAriaLabel = 'Close toast'` のまま
 * (ref: node_modules/sonner/dist/index.mjs:442)。toast 表示中に SR が close
 * button を focus すると "Close toast button" と英語で announce される。
 *
 * 期待 (fix 後):
 *   `<Toaster ... toastOptions={{ closeButtonAriaLabel: '通知を閉じる' }} />`
 *   sonner の `closeButtonAriaLabel` prop を Toaster の toastOptions 経由で
 *   override する。
 *
 * ※ 実 toast 表示は server action 失敗時等のため runtime DOM 検証は環境依存。
 * 本 script は **source 側 regex assert** で `closeButtonAriaLabel: '通知を閉じる'`
 * が src/app/layout.tsx に書かれていることを確認 (build-time)。
 *
 *   pnpm tsx scripts/explore-uiux-toaster-close-button-iter289.ts
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const BASE = 'http://localhost:3001'

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. source 側 assert: layout.tsx の Toaster props に closeButtonAriaLabel が指定されている
  const src = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  const m = src.match(/closeButtonAriaLabel:\s*'([^']+)'/)
  if (!m || !m[1]) {
    findings.push({
      level: 'warning',
      message: `src/app/layout.tsx: Toaster toastOptions に closeButtonAriaLabel が見つからない`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `closeButtonAriaLabel="${m[1]}" を確認`,
    })
    if (!/[぀-ヿ一-鿿]/.test(m[1])) {
      findings.push({
        level: 'warning',
        message: `closeButtonAriaLabel "${m[1]}" に日本語文字が含まれない (英語ノイズ残存)`,
      })
    }
  }

  // 2. iter288 で追加した containerAriaLabel="通知" が runtime で効いているか
  //    runtime で再確認 (回帰防止)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  page.on('pageerror', (e) => {
    findings.push({ level: 'error', message: `pageerror: ${e.message}`.slice(0, 240) })
  })
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    const sectionAriaLabel = await page
      .locator('section[aria-label]')
      .first()
      .getAttribute('aria-label')
    findings.push({
      level: 'info',
      message: `/login (回帰): section aria-label=${JSON.stringify(sectionAriaLabel)}`,
    })
    if (!sectionAriaLabel || !sectionAriaLabel.startsWith('通知')) {
      findings.push({
        level: 'warning',
        message: `/login: containerAriaLabel="通知" の効果が消えている (iter288 invariant 違反)`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (toaster-close-button-iter289) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
