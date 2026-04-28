/**
 * Phase 6.15 loop iter 261 — login / signup Card region に aria-describedby 探索。
 *
 * iter257 で Card に `role="region" aria-labelledby="login-heading|signup-heading"`
 * は付けたが、CardDescription ("最強TODO へようこそ" / "アカウントを作成して始めましょう")
 * は無名 div のまま、Card と関連付いていない。
 *
 * SR が region に入った瞬間の announce は「ログイン, region」/「サインアップ, region」
 * だけ。CardDescription は別途 reading order で読み上げられるが、region 入境時に
 * 「説明文も一緒に announce する」ことは出来ていない。
 *
 * 期待 (fix 後):
 *   /login Card に aria-describedby="login-description"、CardDescription に id 付与
 *   /signup 同様 (signup-description)
 *   SR が region に入った時に "ログイン. 最強TODO へようこそ" のように
 *   description も連続 announce される。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-card-described-iter261.ts
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

  async function audit(path: string, expectedDescId: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    const card = page.locator('[role="region"][data-slot="card"]').first()
    const describedBy = await card.getAttribute('aria-describedby')
    const desc = page.locator('[data-slot="card-description"]').first()
    const descId = await desc.getAttribute('id')
    const descText = (await desc.textContent())?.trim()
    findings.push({
      level: 'info',
      message: `${path}: card aria-describedby=${describedBy} desc-id=${descId} desc-text=${JSON.stringify(descText)}`,
    })
    if (describedBy !== expectedDescId) {
      findings.push({
        level: 'warning',
        message: `${path}: Card に aria-describedby=${expectedDescId} 未設定 — region 入境時に description が一緒に announce されない`,
      })
    }
    if (descId !== expectedDescId) {
      findings.push({
        level: 'warning',
        message: `${path}: CardDescription に id=${expectedDescId} 未付与 — aria-describedby の参照先が解決しない`,
      })
    }
  }

  try {
    await audit('/login', 'login-description')
    await audit('/signup', 'signup-description')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-card-described-iter261) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
