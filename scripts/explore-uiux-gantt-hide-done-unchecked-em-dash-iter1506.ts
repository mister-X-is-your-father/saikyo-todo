/**
 * Phase 6.15 loop iter1506: gantt-view hideDone toggle unchecked path aria-label を
 * em-dash 統一 (regression guard、checked path iter1199 / sibling dependency iter1495
 * の em-dash sweep を unchecked にも展開)。
 *
 * iter1199 で checked path のみ em-dash 化 (`'完了済を隠す — 現在は隠している (クリックで表示に戻す)'`)、
 * unchecked path は `'完了済を隠す (現在は表示中)'` で paren convention 残存。
 * iter1495 dependency toggle / iter1497 MUST 絞り込み / iter1499 engineer-trigger と同 sweep。
 *
 * 修正 (gantt-view.tsx):
 *   unchecked path: `'完了済を隠す (現在は表示中)'`
 *                 → `'完了済を隠す — 現在は表示中'`
 *
 * checked path は iter1199 の `'完了済を隠す — 現在は隠している (クリックで表示に戻す)'` を維持
 * (em-dash + 内側 paren action hint は iter1148 MUST badge と同 nested-paren convention)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-gantt-hide-done-unchecked-em-dash-iter1506.ts
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

  // 1. unchecked em-dash 新形式
  if (!src.includes("'完了済を隠す — 現在は表示中'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt hideDone unchecked path が em-dash 形式 "完了済を隠す — 現在は表示中" でない',
    })
  }
  // 2. 旧 () 残存
  if (src.includes("'完了済を隠す (現在は表示中)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt hideDone unchecked path 旧 () 区切 aria-label が残存',
    })
  }
  // 3. iter1199 invariant: checked path em-dash 維持
  if (!src.includes("'完了済を隠す — 現在は隠している (クリックで表示に戻す)'")) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'iter1199 invariant: gantt hideDone checked path em-dash 形式が破壊された',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — gantt hideDone toggle 両 path aria-label が em-dash convention 統一済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
