/**
 * Phase 6.15 loop iter1727: gantt-view scrollToToday に prefers-reduced-motion check 追加。
 * iter1726 focusElementById と同 WCAG 2.3.3 pattern を gantt-view にも展開。
 *
 * 発見した a11y gap (WCAG 2.3.3 Animation from Interactions):
 *   - src/components/workspace/gantt-view.tsx scrollToToday (line 198) は
 *     `el.scrollTo({ left, behavior })` で behavior default は 'smooth'
 *   - caller (line 448) は button onClick で 'smooth' を明示渡し
 *   - JS smooth scroll は CSS `@media (prefers-reduced-motion: reduce) { scroll-behavior: auto }`
 *     を override する → reduced-motion ユーザでも smooth scroll 発火
 *
 * 影響: gantt-view の「今日にスクロール」 button は user-initiated だが、前庭障害ユーザは
 *   gantt の wide horizontal scroll に smooth が乗ると不快/めまい。WCAG 2.3.3 は
 *   user-triggered motion でも reduced-motion 設定を尊重する spirit。
 *
 * 修正 (src/components/workspace/gantt-view.tsx scrollToToday, 6 line 差替 + 5 line comment):
 *   - `window.matchMedia?.('(prefers-reduced-motion: reduce)').matches` を check
 *   - reduced → `behavior: 'auto'` (instant)、reduced 無 → caller default 'smooth'
 *   - defensive: window 不在 (SSR) / matchMedia 未実装 (jsdom) に optional chain で safe
 *   - shadcn 編集なし、callsite (line 448) は無変更、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-gantt-scroll-reduced-motion-iter1727.ts
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

  const ganttView = readFileSync(
    resolve(here, '../src/components/workspace/gantt-view.tsx'),
    'utf8',
  )

  // --- 1. prefers-reduced-motion check 存在 (scrollToToday 内) ---
  if (!ganttView.includes('prefers-reduced-motion: reduce')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx に prefers-reduced-motion check が無い',
    })
  }

  // --- 2. matchMedia optional chain ---
  if (!ganttView.includes('window.matchMedia?')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx に window.matchMedia? (optional chain) が無い',
    })
  }

  // --- 3. effectiveBehavior 切替 (reduced → 'auto' / default → behavior) ---
  if (
    !ganttView.match(
      /effectiveBehavior:\s*ScrollBehavior\s*=\s*prefersReducedMotion\s*\?\s*'auto'\s*:\s*behavior/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx に effectiveBehavior 切替 ternary が無い',
    })
  }

  // --- 4. SSR guard: typeof window check ---
  if (!ganttView.includes("typeof window !== 'undefined'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx に typeof window !== "undefined" (SSR guard) が無い',
    })
  }

  // --- 5. el.scrollTo は effectiveBehavior 経由 ---
  //   regex: `Math.max(0, target)` の内部 comma が `[^,]+` を break するため、
  //   左側を `[^}]+?` (lazy, brace stop) に。
  if (!ganttView.match(/el\.scrollTo\(\{\s*left:[^}]+?,\s*behavior:\s*effectiveBehavior\s*\}\)/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx の el.scrollTo が effectiveBehavior 経由でない',
    })
  }

  // --- 6. caller (button onClick scrollToToday('smooth')) は不変 ---
  if (!ganttView.match(/onClick=\{\(\) => scrollToToday\('smooth'\)\}/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx の caller scrollToToday("smooth") onClick が変化している',
    })
  }

  // --- 7. iter1726 reference invariant: focusElementById reduced-motion 維持 ---
  const focusUtil = readFileSync(resolve(here, '../src/lib/ui/focus-quick-add.ts'), 'utf8')
  if (!focusUtil.includes('prefers-reduced-motion: reduce')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1726 focusElementById の prefers-reduced-motion check が消えている',
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
      '(なし) — gantt-view scrollToToday が prefers-reduced-motion check で behavior 切替 (WCAG 2.3.3)、iter1726 / iter1725 invariant 不変',
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
