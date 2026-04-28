/**
 * Phase 6.15 loop iter 256 — auth (login / signup) ページに `<main>` ランドマーク
 * が無い件 + CardTitle が `<div>` で programmatic heading になっていない件 +
 * /~offline ページに復帰アクション (retry / Home リンク) が無い件。
 *
 * 背景:
 *   /(auth)/layout.tsx は `<div>` で children を包んでおり、`/login` と
 *   `/signup` 双方に `<main>` landmark が無い。SR は "skip to main" で
 *   form まで飛べず、また page outline が main 不在で歪む。
 *   さらに、login / signup の CardTitle ("ログイン" / "サインアップ") は
 *   shadcn Card の `<div data-slot="card-title">` 実装なので
 *   role=heading が付かず、SR の heading-by-list 操作で見えない。
 *   /~offline は `<main>` こそあるが、再読み込み action や Home 復帰 link が
 *   無く、ユーザは URL バー手動操作 / ブラウザ更新ボタン頼み。
 *
 * 検査ロジック:
 *   - /login / /signup / /~offline に visit
 *   - main landmark count
 *   - h1 (or role=heading aria-level=1) count
 *   - /~offline 内に link or button (動作 trigger になる element) があるか
 *
 * Supabase 不要 (auth 画面 + offline 画面のみで完結)。
 *
 *   pnpm tsx scripts/explore-uiux-auth-landmarks-iter256.ts
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
    const mains = await page.locator('main').count()
    const h1 = await page.locator('h1').count()
    const ariaH1 = await page.locator('[role=heading][aria-level="1"]').count()
    const linkCount = await page.locator('a[href]').count()
    const buttonCount = await page.locator('button').count()
    findings.push({
      level: 'info',
      message: `${path}: main=${mains} h1=${h1} aria-level=1=${ariaH1} a=${linkCount} button=${buttonCount}`,
    })
    if (mains === 0)
      findings.push({ level: 'warning', message: `${path}: <main> ランドマーク欠落` })
    if (h1 === 0 && ariaH1 === 0)
      findings.push({ level: 'warning', message: `${path}: programmatic heading (h1) 欠落` })
  }

  try {
    await audit('/login')
    await audit('/signup')
    await audit('/~offline')

    // /~offline は link + retry button が欲しい
    await page.goto(`${BASE}/~offline`, { waitUntil: 'networkidle' })
    const offlineLinks = await page.locator('main a[href]').count()
    const offlineButtons = await page.locator('main button').count()
    findings.push({
      level: 'info',
      message: `/~offline interactive: link=${offlineLinks} button=${offlineButtons}`,
    })
    if (offlineLinks + offlineButtons === 0) {
      findings.push({
        level: 'warning',
        message:
          '/~offline: 復帰 action (retry button or home link) が皆無 → ユーザはブラウザ更新頼み',
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-landmarks-iter256) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
