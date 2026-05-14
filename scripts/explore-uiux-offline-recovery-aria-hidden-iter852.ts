/**
 * Phase 6.15 loop iter852 — /~offline (Service Worker fallback page) の 2 recovery
 * control (再読み込み button + ホームに戻る Link) の visible text を aria-hidden span
 * で wrap した regression guard。
 *
 * 背景: iter844 (login submit) / iter845 (signup submit) / iter851 (auth footer link)
 * で確立した「aria-label が完全 content を含む button / link は visible 子 text を
 * <span aria-hidden="true"> で wrap し aria-label 単独経路にする」 pattern を
 * /~offline (PWA SW network 失敗 fallback) の 2 control にも展開。
 *
 * /~offline は network 断時にユーザが最初に見る画面で、recovery action 2 つ
 * (再読み込み = 一時 fault、ホームに戻る = 安定 entry に戻る) の SR 識別性は
 * critical UX。両 control は既に aria-label に詳細意図を完全表現済。
 *
 *   pnpm tsx scripts/explore-uiux-offline-recovery-aria-hidden-iter852.ts
 *
 * supabase / login 不要 (静的 page 直アクセスで verify 完結、SW prefetch も不要)。
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
    await page.goto(`${BASE}/~offline`, { waitUntil: 'networkidle' })

    // 1. 再試行 button: aria-label + 子 aria-hidden span ("再読み込みして再試行")
    const retry = page.locator(
      'button[aria-label="再読み込みして再試行 (ページ全体を読み直して接続を回復)"]',
    )
    if ((await retry.count()) !== 1) {
      findings.push({ level: 'error', message: '再試行 button (aria-label) 数 不一致' })
    } else {
      const span = retry.locator('span[aria-hidden="true"]', { hasText: '再読み込みして再試行' })
      if ((await span.count()) !== 1) {
        findings.push({
          level: 'error',
          message:
            '再試行 button の visible "再読み込みして再試行" が aria-hidden span で wrap されていない',
        })
      }
      const box = await retry.boundingBox()
      if (!box || box.height < 44) {
        findings.push({
          level: 'warning',
          message: `再試行 button 高さ ${box?.height ?? '?'}px < 44px (h-11 失効?)`,
        })
      }
    }

    // 2. ホームに戻る Link: aria-label + 子 aria-hidden span
    const home = page.locator(
      'a[aria-label="ホームに戻る (アプリの起点画面に遷移、オンライン復帰後は最新状態を表示)"]',
    )
    if ((await home.count()) !== 1) {
      findings.push({ level: 'error', message: 'ホームに戻る Link (aria-label) 数 不一致' })
    } else {
      const span = home.locator('span[aria-hidden="true"]', { hasText: 'ホームに戻る' })
      if ((await span.count()) !== 1) {
        findings.push({
          level: 'error',
          message:
            'ホームに戻る Link の visible "ホームに戻る" が aria-hidden span で wrap されていない',
        })
      }
      const box = await home.boundingBox()
      if (!box || box.height < 44) {
        findings.push({
          level: 'warning',
          message: `ホームに戻る Link 高さ ${box?.height ?? '?'}px < 44px (h-11 失効?)`,
        })
      }
    }

    // 3. iter732/main-content invariant: <main id="main-content" aria-labelledby="offline-heading">
    const main = page.locator('main#main-content[aria-labelledby="offline-heading"]')
    if ((await main.count()) !== 1) {
      findings.push({
        level: 'error',
        message: '<main id="main-content" aria-labelledby="offline-heading"> が無い',
      })
    }

    // 4. heading H1 が "オフラインです" であること (visible text 不変確認)
    const h1 = page.locator('h1#offline-heading', { hasText: 'オフラインです' })
    if ((await h1.count()) !== 1) {
      findings.push({ level: 'error', message: 'h1#offline-heading="オフラインです" 不一致' })
    }

    // 5. group landmark 健在
    const group = page.locator('div[role="group"][aria-label="復帰アクション"]')
    if ((await group.count()) !== 1) {
      findings.push({
        level: 'error',
        message: '<div role="group" aria-label="復帰アクション"> 不一致',
      })
    }
  } finally {
    await browser.close()
  }

  console.log(`\n=== Findings (offline-recovery-aria-hidden iter852) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
