/**
 * Phase 6.15 loop iter1729: root layout の noscript alert div に data-testid 付与
 * (iter1728 skip-link と同 pattern を JS 無効時の警告 a11y にも展開)。
 *
 * 発見した testability gap:
 *   - src/app/layout.tsx の noscript 内 alert div は role="alert" + 警告 text を持つが
 *     data-testid 未設定 → Playwright で `noscript div[role="alert"]` で発見する必要、
 *     selector が長く JS 無効化 fixture (`browser.newContext({ javaScriptEnabled: false })`)
 *     test で fragile
 *
 * 影響: JS 無効環境 (古いブラウザ / 企業 IT で JS 無効化 / 一部 SR の特殊モード) で
 *   ユーザが alert を見るかの E2E test を書く際に selector が長い、cognitive load。
 *
 * 修正 (src/app/layout.tsx, 1 line + 4 line comment):
 *   noscript alert div に `data-testid="noscript-warning"` 付与。role="alert" / className
 *   / textContent は完全不変、shadcn 編集なし、機能追加なし。
 *
 * 効果: Playwright pattern:
 *   - `const ctx = await browser.newContext({ javaScriptEnabled: false })`
 *   - `await page.locator('[data-testid="noscript-warning"]').textContent()`
 *   - 標準 selector で JS 無 → warning 表示の確認が 1 行で可能
 *
 * 実行: pnpm tsx scripts/explore-uiux-noscript-testid-iter1729.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const rootLayout = readFileSync(resolve(here, '../src/app/layout.tsx'), 'utf8')

  // --- 1. noscript alert div に data-testid="noscript-warning" 付与済 ---
  if (!rootLayout.includes('data-testid="noscript-warning"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'layout.tsx noscript alert div に data-testid="noscript-warning" が無い',
    })
  }

  // --- 2. role="alert" 維持 (SR 即時 announce) ---
  if (!rootLayout.match(/<noscript>[\s\S]+?role="alert"[\s\S]+?<\/noscript>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'layout.tsx noscript 内の role="alert" が消えている',
    })
  }

  // --- 3. visible 警告 text 不変 ---
  if (
    !rootLayout.includes(
      '最強TODO は JavaScript を必要とします。ブラウザで JavaScript を有効にしてください。',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'layout.tsx noscript 警告 text が消えている',
    })
  }

  // --- 4. bg-destructive className (赤背景) 維持 ---
  if (!rootLayout.match(/<noscript>[\s\S]+?bg-destructive[\s\S]+?<\/noscript>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'layout.tsx noscript の bg-destructive (visual urgency) が消えている',
    })
  }

  // --- 5. iter1728 reference invariant: skip-link data-testid 維持 ---
  if (!rootLayout.includes('data-testid="skip-to-main"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1728 skip-link data-testid="skip-to-main" が消えている',
    })
  }

  // --- 6. iter1727 reference invariant: gantt-view reduced-motion 維持 ---
  const ganttView = readFileSync(
    resolve(here, '../src/components/workspace/gantt-view.tsx'),
    'utf8',
  )
  if (!ganttView.includes('prefers-reduced-motion: reduce')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1727 gantt-view prefers-reduced-motion check が消えている',
    })
  }

  // --- 7. iter1726 reference invariant: focusElementById reduced-motion 維持 ---
  const focusUtil = readFileSync(resolve(here, '../src/lib/ui/focus-quick-add.ts'), 'utf8')
  if (!focusUtil.includes('prefers-reduced-motion: reduce')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1726 focusElementById prefers-reduced-motion check が消えている',
    })
  }

  // --- 8. iter1725 reference invariant: auth form data-testid 維持 ---
  const loginForm = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')
  if (!loginForm.includes('data-testid="login-form"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1725 login-form data-testid が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — noscript alert div に data-testid="noscript-warning" 付与済、JS 無効環境 test 標準 selector で書ける、iter1728 / iter1727 / iter1726 / iter1725 invariant 不変',
    )
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
