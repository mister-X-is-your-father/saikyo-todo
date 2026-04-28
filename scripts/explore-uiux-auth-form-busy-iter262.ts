/**
 * Phase 6.15 loop iter 262 — login / signup `<form>` の aria-busy 探索。
 *
 * iter255 で submit button の aria-label に pending 文言を入れたが、`<form>`
 * 自体に `aria-busy` が無いため、SR の form として「処理中」かどうかは
 * button focus 時しか伝わらない。submit 後に他要素 (例: error toast) を読み
 * 上げ始めると、form 全体の状態が SR に届かない。
 *
 * 期待 (fix 後):
 *   submit 前: form aria-busy=null/false
 *   submit 中: form aria-busy="true"
 *
 * 直接計測は dev server で client-side state を変えないと再現できないので、
 * このスクリプトは static markup のみ確認する (aria-busy 属性が "存在"
 * + isPending=false 初期値で "false" or 不在 を許容)。fix では isPending
 * を直接 form に bind すれば SR にリアルタイムに伝わる。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-form-busy-iter262.ts
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
    const ariaBusy = await form.getAttribute('aria-busy')
    findings.push({ level: 'info', message: `${path}: form aria-busy=${ariaBusy}` })
    // 初期は isPending=false なので "false" を出す (属性自体は存在すべき)
    if (ariaBusy !== 'false') {
      findings.push({
        level: 'warning',
        message: `${path}: form に aria-busy bind 不在 — 期待: aria-busy={isPending} (初期 "false") / 実際: ${ariaBusy}`,
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

  console.log(`\n=== Findings (auth-form-busy-iter262) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
