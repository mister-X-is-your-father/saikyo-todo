/**
 * Phase 6.15 loop iter 257 — login / signup / ~offline 画面の深堀り探索。
 *
 * iter256 で `<main>` ランドマークと heading aria-level=1 と /~offline 復帰
 * action を入れた直後の状態で、残りの a11y/UX gap を抽出する。
 *
 * 見るポイント:
 *   - `<Card>` (shadcn) が `aria-labelledby` で heading に紐付いていないため
 *     SR の region/landmark 一覧に「ログイン」/「サインアップ」が現れない
 *   - email 入力に `inputMode="email"` / `spellCheck=false` が無い (mobile
 *     キーボードで @ が出ない / autocorrect が誤変換)
 *   - submit button の `aria-describedby` が無く、エラー時の inline error と
 *     button の関係が SR に伝わらない (これは inline error が `role=alert`
 *     なので live region で読まれるため許容)
 *   - login と signup の Card 内に `aria-labelledby` 非設定 (region 化されず)
 *   - /~offline の OfflineRetryButton と home Link は `<main>` 内だが、
 *     復帰 action が group 化されておらず SR は単独 button 2 つに見える
 *
 * Supabase 不要 (auth + offline のみで完結)。
 *
 *   pnpm tsx scripts/explore-uiux-auth-deep-iter257.ts
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

  async function audit(path: string, label: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })

    // Card に aria-labelledby があるか?
    const cardLabelled = await page.locator('[data-slot="card"][aria-labelledby]').count()
    findings.push({
      level: 'info',
      message: `${label}: card[aria-labelledby]=${cardLabelled}`,
    })

    // email input: inputMode/spellCheck
    if (path === '/login' || path === '/signup') {
      const email = page.locator('#email')
      const inputMode = await email.getAttribute('inputmode')
      const spellCheck = await email.getAttribute('spellcheck')
      const autoCapitalize = await email.getAttribute('autocapitalize')
      findings.push({
        level: 'info',
        message: `${label}: email inputmode=${inputMode} spellcheck=${spellCheck} autocapitalize=${autoCapitalize}`,
      })
      if (inputMode !== 'email')
        findings.push({
          level: 'warning',
          message: `${label}: email に inputMode="email" 不在 (mobile キーボード最適化漏れ)`,
        })
      if (spellCheck !== 'false')
        findings.push({
          level: 'warning',
          message: `${label}: email に spellCheck=false 不在 (autocorrect で誤変換の risk)`,
        })
      if (autoCapitalize !== 'none' && autoCapitalize !== 'off')
        findings.push({
          level: 'warning',
          message: `${label}: email に autoCapitalize=none 不在 (mobile で先頭大文字化される)`,
        })
    }

    // Card description が aria-describedby で heading と紐付いているか
    if (path === '/login' || path === '/signup') {
      const headingId = await page
        .locator('[role=heading][aria-level="1"]')
        .first()
        .getAttribute('id')
      findings.push({
        level: 'info',
        message: `${label}: heading id=${headingId}`,
      })
      const expectedId = path === '/login' ? 'login-heading' : 'signup-heading'
      if (headingId !== expectedId)
        findings.push({
          level: 'warning',
          message: `${label}: heading id 未設定 (期待: ${expectedId}) — Card の aria-labelledby が機能しない`,
        })
      if (cardLabelled !== 1)
        findings.push({
          level: 'warning',
          message: `${label}: card[aria-labelledby] が ${cardLabelled} 件 (期待: 1) — Card の region 化漏れ`,
        })
    }
  }

  try {
    await audit('/login', '/login')
    await audit('/signup', '/signup')
    await audit('/~offline', '/~offline')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-deep-iter257) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
