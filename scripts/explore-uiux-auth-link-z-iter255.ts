/**
 * Phase 6.15 loop iter 255 — auth (login / signup) form の submit button が
 * pending 状態を screen reader に再 announce していない件。
 *
 * 背景: iter180-222 で各 panel の主要 button (Workflow / Sprint / Goal /
 * Archived 復元 等) に pending / 通常 で aria-label を 2 状態別文言にする
 * パターンを展開してきた。login-form.tsx / signup-form.tsx の submit button
 * は 取り残されており、disabled={isPending} + 表示テキストを「ログイン中...」
 * に切替えるだけで aria-label が無い。SR は visible label の変化を再 announce
 * しないので「処理中であること」がアナウンスされない。
 *
 * 検査ロジック:
 *   - /login と /signup に visit
 *   - submit button の aria-label と inner text を取得
 *   - aria-label が無い (= pending 切替できない) ことを観察として記録
 *
 * Supabase 不要 (login 画面のみで完結)。
 *
 *   pnpm tsx scripts/explore-uiux-auth-link-z-iter255.ts
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

  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      findings.push({ level: m.type() as 'error' | 'warning', message: m.text().slice(0, 240) })
    }
  })
  page.on('pageerror', (e) => {
    findings.push({ level: 'error', message: `pageerror: ${e.message}`.slice(0, 240) })
  })

  try {
    // --- login form ---
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    const loginBtn = page.locator('form button[type="submit"]').first()
    const loginAriaLabel = await loginBtn.getAttribute('aria-label')
    const loginText = (await loginBtn.textContent())?.trim()
    findings.push({
      level: 'info',
      message: `login submit: text="${loginText}" aria-label=${JSON.stringify(loginAriaLabel)}`,
    })
    if (!loginAriaLabel) {
      findings.push({
        level: 'warning',
        message:
          'login submit button: aria-label が無い → pending 切替で SR 再 announce されない (iter180-222 同パターンの取り残し)',
      })
    }

    // --- signup form ---
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' })
    const signupBtn = page.locator('form button[type="submit"]').first()
    const signupAriaLabel = await signupBtn.getAttribute('aria-label')
    const signupText = (await signupBtn.textContent())?.trim()
    findings.push({
      level: 'info',
      message: `signup submit: text="${signupText}" aria-label=${JSON.stringify(signupAriaLabel)}`,
    })
    if (!signupAriaLabel) {
      findings.push({
        level: 'warning',
        message:
          'signup submit button: aria-label が無い → pending 切替で SR 再 announce されない (iter180-222 同パターンの取り残し)',
      })
    }

    // --- empty submit → role=alert で error が rendering されるか (sanity check) ---
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('form button[type="submit"]').click()
    // RHF の zodResolver が走り role="alert" の <p> が出るはず
    const alertCount = await page.locator('form [role="alert"]').count()
    findings.push({
      level: 'info',
      message: `login empty submit → role=alert count=${alertCount} (>=1 期待)`,
    })
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-link-z-iter255) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
