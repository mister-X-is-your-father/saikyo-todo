/**
 * Phase 6.15 loop iter1199: gantt-view gantt-hide-done-toggle checkbox aria-label visible-prefix +
 * WCAG 2.5.3 regression guard。
 *
 * iter1199 で発見した微細だが正しい WCAG 2.5.3 違反: gantt-view.tsx `gantt-hide-done-toggle`
 * checkbox の checked path 旧 aria-label '完了済を隠している (クリックで表示)' は visible
 * "完了済を隠す" を literal substring に含まず ("隠す" vs "隠して" の conjugation divergence) =
 * WCAG 2.5.3 (Label in Name) 違反 + voice control「click 完了済を隠す」 strict match 不可。
 * unchecked path は visible "完了済を隠す" が prefix にあって OK。
 *
 * 修正 (gantt-view.tsx):
 *   - 旧 checked: '完了済を隠している (クリックで表示)'
 *   - 新 checked: '完了済を隠す — 現在は隠している (クリックで表示に戻す)'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-gantt-hide-done-visible-prefix-iter1199.ts
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
  const filePath = resolve(here, '../src/components/workspace/gantt-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'完了済を隠す — 現在は隠している (クリックで表示に戻す)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-hide-done checked path が visible "完了済を隠す" 冒頭固定でない',
    })
  }
  // 旧 aria-label の active code 残存を確認 (comment 内の言及は除外)
  // hideDone path で旧 string が aria-label として残存していないか
  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (codeOnly.includes("? '完了済を隠している (クリックで表示)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '旧 aria-label "完了済を隠している (...)" (WCAG 2.5.3 違反: visible "完了済を隠す" 不含) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — gantt-hide-done checked path は visible "完了済を隠す" 冒頭固定済 (WCAG 2.5.3 satisfy)',
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
