/**
 * Phase 6.15 loop iter 291 — iter283 で Card から role="region" を削除した後、
 * 残置していた `aria-labelledby` / `aria-describedby` 属性 (および対応する
 * CardDescription の `id`) が **inert dead code** になっている問題。
 *
 * 経緯:
 *   - iter283: Card の role="region" を削除して form landmark との重複解消
 *   - 但し Card 自体の aria-labelledby="login-heading" + aria-describedby=
 *     "login-description" は残置 ("将来 role 復活時に useful" との判断)
 *
 * 現状再評価:
 *   - role / tabindex 無しの `<div>` で aria-labelledby は SR landmark
 *     navigation に効かない (landmark でない)。focus 受領時のみ accessible
 *     name として使われる場合があるが、Card に tabindex 無しのため focus
 *     しない → 完全に inert。
 *   - aria-describedby も同様、focus 不可なので inert。
 *   - CardDescription の id="login-description" / "signup-description" は
 *     Card の aria-describedby から参照されるためだけに付いており、その
 *     参照が inert なので id も dead。
 *   - codebase 内他で Card+role="region" を使う panel は **個別 unique
 *     aria-label** で landmark name 付与しており、aria-labelledby を
 *     CardTitle 経由で参照する pattern は無い → 「将来 role 復活時に
 *     useful」の前提も成立しない。
 *
 * 結論: 残置しても害は無いが、既に dead な ARIA 属性は read 時に「何故
 * これが付いているのか?」と疑問を生み、新規 contributor を惑わす。
 *
 * fix: Card から `aria-labelledby` / `aria-describedby` を削除 + CardDescription
 * から `id` を削除 (合計 4 行 × 2 ファイル = 8 行差替え)。h1 の `id` は
 * form の aria-labelledby="*-heading" が依然 reference するので残置。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-card-aria-cleanup-iter291.ts
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

  async function audit(path: string, expectedHeadingId: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })

    // 1. Card から aria-labelledby / aria-describedby が削除されている
    const cardAttrs = await page.evaluate(() => {
      const card = document.querySelector('[data-slot="card"]')
      return {
        ariaLabelledby: card?.getAttribute('aria-labelledby') ?? null,
        ariaDescribedby: card?.getAttribute('aria-describedby') ?? null,
      }
    })
    findings.push({
      level: 'info',
      message: `${path}: Card aria-attrs=${JSON.stringify(cardAttrs)}`,
    })
    if (cardAttrs.ariaLabelledby || cardAttrs.ariaDescribedby) {
      findings.push({
        level: 'warning',
        message: `${path}: Card に dead aria-attrs が残っている`,
      })
    }

    // 2. CardDescription の id は削除されている (もう参照されないため)
    const descId = await page.evaluate(() => {
      const desc = document.querySelector('[data-slot="card-description"]')
      return desc?.getAttribute('id') ?? null
    })
    findings.push({
      level: 'info',
      message: `${path}: CardDescription id=${JSON.stringify(descId)}`,
    })
    if (descId) {
      findings.push({
        level: 'warning',
        message: `${path}: CardDescription id="${descId}" が dead (Card aria-describedby が参照しない)`,
      })
    }

    // 3. h1 の id は維持されている (form の aria-labelledby が依然 reference)
    const h1Id = await page.evaluate(() => document.querySelector('h1')?.getAttribute('id'))
    if (h1Id !== expectedHeadingId) {
      findings.push({
        level: 'warning',
        message: `${path}: h1 id="${h1Id}" 期待="${expectedHeadingId}" — form aria-labelledby reference が壊れる`,
      })
    }

    // 4. form の aria-labelledby は h1 id を依然 refer して landmark name 維持
    const formLb = await page.locator('form').first().getAttribute('aria-labelledby')
    if (formLb !== expectedHeadingId) {
      findings.push({
        level: 'warning',
        message: `${path}: form aria-labelledby="${formLb}" 期待="${expectedHeadingId}"`,
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

  console.log(`\n=== Findings (auth-card-aria-cleanup-iter291) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
