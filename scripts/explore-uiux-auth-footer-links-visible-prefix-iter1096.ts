/**
 * Phase 6.15 loop iter1096: /login と /signup の footer cross-link (signup-link / login-link) の
 * visible-prefix 配置 regression guard。
 *
 * iter1096 で発見した bug: 旧 aria-label "アカウントをお持ちでない方はこちらでサインアップ" /
 * "既にアカウントをお持ちの方はこちらでログイン" は visible "サインアップ" / "ログイン" を
 * 末尾に持ち、voice control prefix-matching で「click サインアップ」/「click ログイン」 match 不可。
 * iter1093-1095 sweep convention に合わせ visible 冒頭固定。
 *
 * 修正 (login/page.tsx + signup/page.tsx): footer link 2 件の aria-label を visible-prefix 形式
 * "サインアップ — アカウント未作成の方はこちらから新規登録" / "ログイン — 既にアカウントを..." に。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-auth-footer-links-visible-prefix-iter1096.ts
 * 前提: pnpm dev port 3001 起動済
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3001'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  // /login の signup-link
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  const signupLink = page.locator('a[data-testid="signup-link"]')
  const signupAria = (await signupLink.getAttribute('aria-label')) ?? ''
  const signupVisible = (await signupLink.innerText()).trim()
  console.log(`/login signup-link aria: ${JSON.stringify(signupAria)}`)
  console.log(`/login signup-link visible: ${JSON.stringify(signupVisible)}`)
  if (!signupAria.startsWith(signupVisible)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/login signup-link aria-label が visible "${signupVisible}" で始まらない (現在: "${signupAria.slice(0, 30)}...")`,
    })
  }

  // /signup の login link
  await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' })
  const loginLink = page.locator('a[href="/login"]')
  const loginAria = (await loginLink.getAttribute('aria-label')) ?? ''
  const loginVisible = (await loginLink.innerText()).trim()
  console.log(`/signup login-link aria: ${JSON.stringify(loginAria)}`)
  console.log(`/signup login-link visible: ${JSON.stringify(loginVisible)}`)
  if (!loginAria.startsWith(loginVisible)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/signup login-link aria-label が visible "${loginVisible}" で始まらない (現在: "${loginAria.slice(0, 30)}...")`,
    })
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — /login signup-link + /signup login-link 両方 visible-prefix 配置済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
