/**
 * Phase 6.15 loop iter 283 — login/signup の Card role="region" が form landmark
 * と同じ名前 ("ログイン" / "サインアップ") で重複 → SR landmark 過多。
 *
 * 現状 /login のページで SR が exposed する landmark:
 *   1. main (auth/layout の <main>、unnamed)
 *   2. region "ログイン" (Card に role="region" + aria-labelledby="login-heading")
 *   3. form "ログイン" (LoginForm の <form aria-labelledby="login-heading">、
 *      HTML5 spec: form 要素は accessible name を持つと暗黙 landmark 化)
 *
 * 同じ名前の region と form が並ぶため、SR の landmark navigation (NVDA D /
 * VO-cmd-U) で「ログイン region / ログイン form」と冗長に列挙される。content
 * 自体も同じ Card 内 form なので 2 つに分けて navigate する意味は無い。
 *
 * 期待 (fix 後):
 *   Card から role="region" を削除 → region landmark を消去、form landmark
 *   "ログイン" を残す。SR の landmark 総数: 3 → 2 (main + form "ログイン")。
 *   aria-labelledby / aria-describedby は Card に残す (生 div metadata、無害、
 *   将来 role 復活時に useful)。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-card-region-iter283.ts
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

  async function audit(path: string, expectedFormName: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })

    // Card の role="region" が消えていること
    const regionCount = await page.locator('[role="region"]').count()
    findings.push({
      level: 'info',
      message: `${path}: role="region" 要素数=${regionCount} (期待: 0)`,
    })
    if (regionCount > 0) {
      findings.push({
        level: 'warning',
        message: `${path}: role="region" が残っている (form landmark と重複)`,
      })
    }

    // form landmark は依然 named (aria-labelledby="<name>-heading") のまま
    const formAriaLabelledby = await page.locator('form').first().getAttribute('aria-labelledby')
    findings.push({
      level: 'info',
      message: `${path}: form aria-labelledby=${JSON.stringify(formAriaLabelledby)}`,
    })
    if (!formAriaLabelledby || !formAriaLabelledby.endsWith('-heading')) {
      findings.push({
        level: 'warning',
        message: `${path}: form aria-labelledby が見つからない、form landmark の name が消失する`,
      })
    }

    // landmark 内で "<name>" 名の重複が無いこと (form のみ)
    const namedLandmarks = await page.evaluate((heading: string) => {
      const list: { role: string; name: string }[] = []
      const el = document.getElementById(heading)
      const headingText = el?.textContent ?? ''
      document
        .querySelectorAll(
          '[role="region"], [role="form"], main[aria-label], main[aria-labelledby], form',
        )
        .forEach((node) => {
          const role = node.getAttribute('role') ?? node.tagName.toLowerCase()
          const al = node.getAttribute('aria-label') ?? ''
          const lb = node.getAttribute('aria-labelledby')
          let name = al
          if (lb) {
            const ref = document.getElementById(lb)
            name = ref?.textContent ?? ''
          }
          if (name === headingText) list.push({ role, name })
        })
      return list
    }, expectedFormName)
    findings.push({
      level: 'info',
      message: `${path}: heading-text と同名の landmark = ${JSON.stringify(namedLandmarks)}`,
    })
    if (namedLandmarks.length > 1) {
      findings.push({
        level: 'warning',
        message: `${path}: heading と同名の landmark が ${namedLandmarks.length} 件あり (1 件期待)`,
      })
    }
  }

  try {
    await audit('/login', 'login-heading')
    await audit('/signup', 'signup-heading')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-card-region-iter283) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
