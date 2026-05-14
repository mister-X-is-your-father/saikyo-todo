/**
 * Phase 6.15 loop iter851 — /login と /signup の CardFooter Link の visible text
 * (「サインアップ」 / 「ログイン」) を aria-hidden span で wrap した regression guard。
 *
 * 背景: iter844 (login submit) / iter845 (signup submit) / iter846-850 で確立した
 * 「aria-label が完全 content を含む button / link は visible 子 text を
 * <span aria-hidden="true"> で wrap し aria-label 単独経路にする」 pattern を
 * auth surface の最後の残箇所 (CardFooter Link x2) にも展開。
 *
 * Link は既に aria-label="アカウントをお持ちでない方はこちらでサインアップ" /
 * "既にアカウントをお持ちの方はこちらでログイン" で意図・対象を完全表現しており、
 * visible "サインアップ" / "ログイン" は視覚 navigation cue のみ。aria-label と
 * visible text が同居すると WCAG 2.5.3 (Label in Name) は満たすが、AT 実装に
 * よっては visible 子 text を別経路で読み上げる可能性がある (iter844-850 同論)。
 *
 *   pnpm tsx scripts/explore-uiux-auth-footer-link-aria-hidden-iter851.ts
 *
 * supabase / login 不要 (静的 page 直アクセスで verify 完結)。
 */
import { chromium } from '@playwright/test'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const BASE = 'http://localhost:3001'

async function audit(url: string, label: string, expectedAriaLabel: string, visibleText: string) {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })

    // 1. footer Link が aria-label を保持しているか
    const link = page.locator(`a[aria-label="${expectedAriaLabel}"]`)
    const count = await link.count()
    if (count !== 1) {
      findings.push({
        level: 'error',
        message: `${label}: aria-label="${expectedAriaLabel}" の Link 数 ${count} (期待 1)`,
      })
      await browser.close()
      return findings
    }

    // 2. Link 直下に <span aria-hidden="true">${visibleText}</span> があるか
    const span = link.locator('span[aria-hidden="true"]', { hasText: visibleText })
    const spanCount = await span.count()
    if (spanCount !== 1) {
      findings.push({
        level: 'error',
        message: `${label}: <span aria-hidden="true">${visibleText}</span> が見つからない (${spanCount})`,
      })
    }

    // 3. accessible name が aria-label と一致するか (visible text からの hijack が起きていないか)
    const accessibleName = await link.evaluate((el) => {
      return el.getAttribute('aria-label') || (el.textContent ?? '').trim()
    })
    if (accessibleName !== expectedAriaLabel) {
      findings.push({
        level: 'error',
        message: `${label}: accessible name "${accessibleName}" ≠ aria-label "${expectedAriaLabel}"`,
      })
    }

    // 4. iter287 regression: link 高さ >= 24px (WCAG 2.5.8 AA)
    const box = await link.boundingBox()
    if (!box || box.height < 24) {
      findings.push({
        level: 'warning',
        message: `${label}: link 高さ ${box?.height ?? '?'}px < 24px (WCAG 2.5.8)`,
      })
    }

    // 5. iter844/845 invariant: submit button 内 visible は aria-hidden span で wrap 済
    const submit = page.locator('button[type="submit"][data-testid$="-submit"]')
    const submitSpanAriaHidden = await submit.locator('span[aria-hidden="true"]').count()
    if (submitSpanAriaHidden !== 1) {
      findings.push({
        level: 'error',
        message: `${label}: submit button 内 aria-hidden span が ${submitSpanAriaHidden} 件 (期待 1、iter844/845 invariant)`,
      })
    }
  } finally {
    await browser.close()
  }
  return findings
}

async function main(): Promise<void> {
  const all: Finding[] = []
  all.push(
    ...(await audit(
      '/login',
      'login → signup link',
      'アカウントをお持ちでない方はこちらでサインアップ',
      'サインアップ',
    )),
  )
  all.push(
    ...(await audit(
      '/signup',
      'signup → login link',
      '既にアカウントをお持ちの方はこちらでログイン',
      'ログイン',
    )),
  )

  console.log(`\n=== Findings (auth-footer-link-aria-hidden iter851) ===`)
  if (all.length === 0) console.log('(なし) 期待どおり全 invariant OK')
  for (const f of all) console.log(`  [${f.level}] ${f.message}`)
  process.exit(all.some((f) => f.level === 'error') ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
