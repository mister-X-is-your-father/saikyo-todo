/**
 * Phase 6.15 loop iter1493 (mode-D = Dark a11y): DataWidgetCard error state dark contrast。
 *
 * Bug: data-widget-card.tsx の error state container は
 *   `text-destructive border-rose-200 bg-rose-50 p-3 ...`
 * で text-destructive のみ theme-aware、border-rose-200 / bg-rose-50 は light 固定。
 * dark mode で text-destructive (≈red-500 系の dark token) が `bg-rose-50` (light 固定)
 * 上に乗ると container 自体が light 色のまま「明色 box が dark 背景に浮く」 + 内部 text
 * の contrast が想定外 (1.04 等 white-on-white pattern 同型、WCAG 1.4.3 serious)。
 * iter1376 RecoveryPlanSection で同 root cause (bg-rose-50 + theme-aware text) を fix
 * 済、その時に「data-widget-card error 状態も同型 dark 懸念 (widget error state で
 * 再現困難、別 iter)」 として deferred 記録。本 iter で着地。
 *
 * 修正: border-rose-200 + bg-rose-50 に dark 等価 token を併記:
 *   - border-rose-200 → + dark:border-rose-900/50
 *   - bg-rose-50      → + dark:bg-rose-950/30
 * iter1376 と byte-identical な fix pattern (recovery-plan-section, premortem 等
 * の rose-50 family 横展開 lead と統一)。text-destructive (CSS var) は light/dark 両方で
 * 適切 contrast を保つ token のため改変不要、bg/border の dark trail のみ追加。
 *
 * これで mode-D dark contrast sweep の iter1376 deferred lead を 1 件着地。
 * widget error は data-widget-card を使う全 widget で render される (BudgetPanel /
 * dashboard chips / panels 等)。
 *
 * 経路 B: source-side regex assert + iter1376 invariant cross-check (recovery-plan)。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-axe-data-widget-error-dark-iter1493.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const widget = readFileSync(
    resolve(process.cwd(), 'src/components/shared/data-widget-card.tsx'),
    'utf8',
  )

  // 1. error container の dark border token 追加
  if (!widget.includes('dark:border-rose-900/50')) {
    findings.push({
      level: 'error',
      message: 'data-widget-card.tsx: error container に dark:border-rose-900/50 不在',
    })
  }
  // 2. error container の dark bg token 追加
  if (!widget.includes('dark:bg-rose-950/30')) {
    findings.push({
      level: 'error',
      message: 'data-widget-card.tsx: error container に dark:bg-rose-950/30 不在',
    })
  }
  // 3. text-destructive は light/dark 両 token 保持 (regression guard)
  if (!widget.includes('text-destructive')) {
    findings.push({
      level: 'error',
      message: 'data-widget-card.tsx: text-destructive 喪失',
    })
  }
  // 4. iter1376 recovery-plan-section invariant cross-check (回帰 guard)
  const recovery = readFileSync(
    resolve(process.cwd(), 'src/components/item/recovery-plan-section.tsx'),
    'utf8',
  )
  if (!recovery.includes('dark:bg-rose-950/30') && !recovery.includes('dark:bg-rose-900')) {
    findings.push({
      level: 'error',
      message:
        'recovery-plan-section.tsx: iter1376 dark:bg-rose-* invariant 喪失 (本 iter pattern と divergence)',
    })
  }

  console.log(`\n=== Findings (iter1493 data-widget-card error dark fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — data-widget-card error dark + iter1376 recovery-plan-section invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
