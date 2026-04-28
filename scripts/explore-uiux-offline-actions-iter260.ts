/**
 * Phase 6.15 loop iter 260 — /~offline 復帰アクション群の semantic 探索。
 *
 * 現状: `<main>` 直下に h1 / p×2 / `<div class="flex">` で reload button +
 * home link が並んでいる。SR は 2 つの button/link を「孤立したコントロール」
 * として読み上げ、「これは復帰アクションの集合だ」という関係が伝わらない。
 *
 * 期待 (fix 後):
 *   action wrapper に `role="group" aria-label="復帰アクション"` (or aria-labelledby)
 *   が付き、SR の region/group 一覧に "復帰アクション" 群として現れる。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-offline-actions-iter260.ts
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
    await page.goto(`${BASE}/~offline`, { waitUntil: 'networkidle' })

    const groups = await page.locator('[role="group"]').count()
    findings.push({ level: 'info', message: `/~offline: role=group 個数=${groups}` })

    const labelledGroups = await page.locator('[role="group"][aria-label]').count()
    findings.push({
      level: 'info',
      message: `/~offline: role=group + aria-label 個数=${labelledGroups}`,
    })

    if (labelledGroups < 1) {
      findings.push({
        level: 'warning',
        message:
          '/~offline: 復帰 action 2 個 (reload button / home link) が group 化されていない — SR は孤立コントロール 2 つに見え、「復帰アクション群」という関係が伝わらない',
      })
    }

    // 確認: button + home link が group 内に収まるか
    const buttonInGroup = await page.locator('[role="group"] button[aria-label*="再試行"]').count()
    const linkInGroup = await page.locator('[role="group"] a[href="/"]').count()
    findings.push({
      level: 'info',
      message: `/~offline: group 内 reload button=${buttonInGroup} home link=${linkInGroup}`,
    })
    if (labelledGroups >= 1 && (buttonInGroup !== 1 || linkInGroup !== 1)) {
      findings.push({
        level: 'warning',
        message: '/~offline: group はあるが reload button / home link が中に入っていない',
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (offline-actions-iter260) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
