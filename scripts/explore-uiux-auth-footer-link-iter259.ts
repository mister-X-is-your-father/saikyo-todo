/**
 * Phase 6.15 loop iter 259 — login / signup footer link の aria-label 探索。
 *
 * iter258 までで auth ページ a11y は (form / heading / region / mobile / title)
 * 5 段は固めた。次に SR user が tab 操作で footer に着く時の情報量を見る。
 *
 * 現状:
 *   /login   : `<span>アカウント未作成?</span> <Link>サインアップ</Link>`
 *   /signup  : `<span>アカウントあり?</span> <Link>ログイン</Link>`
 *
 * 問題: SR は span と link を別 node として読み上げる (隣接でも自動結合しない)。
 * link 単体に focus した時のテキストは "サインアップ" / "ログイン" だけ。
 * これだと「今いる画面と link 先がどんな関係か」分からず、誤遷移しやすい。
 * fix 方針: Link に `aria-label="アカウントをお持ちでない方はこちらでサインアップ"`
 * (login) / `aria-label="既にアカウントをお持ちの方はこちらでログイン"` (signup)
 *
 * 期待 (fix 後):
 *   /login footer link aria-label =~ /サインアップ/ かつ /アカウント/
 *   /signup footer link aria-label =~ /ログイン/ かつ /アカウント/
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-footer-link-iter259.ts
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

  async function audit(path: string, expectedHrefSuffix: string, expectKeyword: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    const link = page.locator(`a[href="${expectedHrefSuffix}"]`).first()
    const aria = await link.getAttribute('aria-label')
    const text = (await link.textContent())?.trim()
    findings.push({
      level: 'info',
      message: `${path}: footer link href=${expectedHrefSuffix} text=${JSON.stringify(text)} aria-label=${JSON.stringify(aria)}`,
    })
    if (!aria) {
      findings.push({
        level: 'warning',
        message: `${path}: footer link に aria-label 不在 — SR は visible text "${text}" のみで context lost`,
      })
    } else if (!aria.includes(expectKeyword) || !aria.includes('アカウント')) {
      findings.push({
        level: 'warning',
        message: `${path}: footer link aria-label が短すぎ (${aria}) — "アカウント" + "${expectKeyword}" を含む説明的文言を期待`,
      })
    }
  }

  try {
    await audit('/login', '/signup', 'サインアップ')
    await audit('/signup', '/login', 'ログイン')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-footer-link-iter259) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
