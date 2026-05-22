/**
 * Phase 6.15 loop iter1086: mock-timesheet login form の error 表示が日本語化されている事を確認する
 * regression guard。
 *
 * iter1086 で発見した bug: MockTimesheetLoginInputSchema は zod default error (英語) を露出していた:
 *   - email: "Invalid email address"
 *   - password: "Too small: expected string to have >=1 characters"
 * 日本語 UI 利用者の認知負荷高、saikyo-todo 本体の SignupInput/LoginInput は全て日本語化済で
 * 一貫性 gap。MockTimesheetSubmitInputSchema も同 pattern (workDate のみ 'YYYY-MM-DD' で他は無設定)。
 *
 * 修正 (schema.ts): auth/schema.ts と convention を揃え、Login + Submit の両 schema に
 * 日本語 validation message を全付与。
 *
 * 本 script は mock-login ページで empty submit → error msg が日本語かを assert。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-timesheet-login-errors-ja-iter1086.ts
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

  await page.goto(`${BASE}/mock-timesheet/login`, { waitUntil: 'networkidle' })
  await page.locator('button#tsLoginSubmit').click()
  await page.waitForTimeout(500)

  const emailErr = (
    await page
      .locator('p#tsEmail-error')
      .innerText()
      .catch(() => '')
  ).trim()
  const pwErr = (
    await page
      .locator('p#tsPassword-error')
      .innerText()
      .catch(() => '')
  ).trim()
  console.log(`emailErr: "${emailErr}"`)
  console.log(`pwErr: "${pwErr}"`)

  // 日本語 error の判定: ASCII 文字以外を含むか (= 日本語 / 漢字 / かな の Unicode)
  const isJa = (s: string) => /[　-鿿＀-￯]/.test(s)
  if (!emailErr) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tsEmail-error が表示されない (empty submit で zod email/min 検証エラーのはず)',
    })
  } else if (!isJa(emailErr)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tsEmail-error が日本語でない: "${emailErr}"`,
    })
  }
  if (!pwErr) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tsPassword-error が表示されない',
    })
  } else if (!isJa(pwErr)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tsPassword-error が日本語でない: "${pwErr}"`,
    })
  }

  // 念のため英語 zod default が漏れていないかも assert
  for (const bad of ['Invalid email', 'expected string', 'Too small', 'Too big']) {
    if (emailErr.includes(bad) || pwErr.includes(bad)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `zod default English message "${bad}" が露出 — schema 側で日本語化漏れ`,
      })
    }
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — mock-timesheet login error は日本語表示')
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
