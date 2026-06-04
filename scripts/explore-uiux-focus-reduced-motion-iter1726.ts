/**
 * Phase 6.15 loop iter1726: focusElementById (src/lib/ui/focus-quick-add.ts) に
 * prefers-reduced-motion check を追加し、JS scrollIntoView の smooth scroll を
 * reduced-motion ユーザに対しては instant に fall back (WCAG 2.3.3 対応)。
 *
 * 発見した a11y gap (WCAG 2.3.3 Animation from Interactions):
 *   - globals.css line 144 で CSS `scroll-behavior: auto !important` を @media
 *     (prefers-reduced-motion: reduce) に適用済
 *   - しかし JS `scrollIntoView({ behavior: 'smooth' })` は CSS scroll-behavior を
 *     override するため、reduced-motion ユーザでも smooth scroll が発火
 *   - focusElementById は 3 caller (global-shortcuts / focus-quick-add-button /
 *     FocusFormCta 6 panel) で広く呼ばれるため、reduced-motion violation の影響大
 *
 * 影響: 前庭障害ユーザ (motion sickness 罹患者) が q キー / 「作成フォームへ」 CTA を
 *   押すたびに、OS の「視差効果を減らす」設定を無視して smooth scroll が発火、不快/めまい。
 *
 * 修正 (src/lib/ui/focus-quick-add.ts focusElementById, 6 line 差替 + 8 line comment):
 *   - `window.matchMedia('(prefers-reduced-motion: reduce)').matches` を check
 *   - reduced → `behavior: 'auto'` (instant)、reduced 無 → `behavior: 'smooth'` (現行 default)
 *   - defensive: window 不在 (SSR) / matchMedia 未実装 (jsdom) に optional chain で safe
 *   - shadcn 編集なし、既存 default behavior 維持 (= test 不影響)
 *
 * 追加 test (src/lib/ui/focus-quick-add.test.ts, 1 test 追加):
 *   - matchMedia をモック → reduced-motion: reduce → behavior:"auto" が呼ばれる事を assert
 *
 * 実行: pnpm tsx scripts/explore-uiux-focus-reduced-motion-iter1726.ts
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

  const focusUtil = readFileSync(resolve(here, '../src/lib/ui/focus-quick-add.ts'), 'utf8')
  const focusTest = readFileSync(resolve(here, '../src/lib/ui/focus-quick-add.test.ts'), 'utf8')

  // --- 1. prefers-reduced-motion check 存在 ---
  if (!focusUtil.includes('prefers-reduced-motion: reduce')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'focus-quick-add.ts に prefers-reduced-motion check が無い',
    })
  }

  // --- 2. matchMedia 経路 + optional chain で SSR / jsdom safe ---
  if (!focusUtil.includes('window.matchMedia?')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'focus-quick-add.ts に window.matchMedia? (optional chain) が無い',
    })
  }

  // --- 3. behavior 切替 (reduced → 'auto' / default → 'smooth') ---
  if (!focusUtil.match(/behavior:\s*prefersReducedMotion\s*\?\s*'auto'\s*:\s*'smooth'/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'focus-quick-add.ts に behavior 切替 (auto/smooth) ternary が無い',
    })
  }

  // --- 4. SSR guard: typeof window check ---
  if (!focusUtil.includes("typeof window !== 'undefined'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'focus-quick-add.ts に typeof window !== "undefined" (SSR guard) が無い',
    })
  }

  // --- 5. 新 test 追加 (reduced-motion → behavior:"auto") ---
  if (!focusTest.includes('iter1726: prefers-reduced-motion')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'focus-quick-add.test.ts に iter1726 reduced-motion test が無い',
    })
  }
  if (!focusTest.match(/scrollSpy\s*\)\.toHaveBeenCalledWith\(\{\s*behavior:\s*'auto'/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'focus-quick-add.test.ts の reduced-motion test で behavior:"auto" assert が無い',
    })
  }

  // --- 6. 既存 default behavior:'smooth' invariant 維持 (回帰 guard) ---
  if (!focusTest.match(/scrollSpy\s*\)\.toHaveBeenCalledWith\(\{\s*behavior:\s*'smooth'/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'focus-quick-add.test.ts の default behavior:"smooth" test が消えている (回帰)',
    })
  }

  // --- 7. iter1725 reference invariant: auth form data-testid 維持 ---
  const loginForm = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')
  const signupForm = readFileSync(resolve(here, '../src/components/auth/signup-form.tsx'), 'utf8')
  if (
    !loginForm.includes('data-testid="login-form"') ||
    !signupForm.includes('data-testid="signup-form"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1725 auth form data-testid のいずれかが消えている',
    })
  }

  // --- 8. globals.css の reduced-motion @media block 不変 (CSS 経路は引き続き有効) ---
  const globalsCss = readFileSync(resolve(here, '../src/app/globals.css'), 'utf8')
  if (!globalsCss.includes('@media (prefers-reduced-motion: reduce)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'globals.css の @media (prefers-reduced-motion: reduce) block が消えている (CSS reset 回帰)',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — focusElementById が JS scrollIntoView でも prefers-reduced-motion check で behavior 切替 (WCAG 2.3.3)、iter1725 / globals.css CSS reset 不変',
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
