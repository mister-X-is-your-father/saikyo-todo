/**
 * Phase 6.15 loop iter1493: operation-board-widget の quick-wins / focus-blocks button
 * aria-label em-dash 統一 (regression guard)。
 *
 * iter1093-1151 sweep で visible-prefix button aria-label を em-dash 区切に統一済だが
 * operation-board-widget の 2 button (quick-wins list / focus-blocks list) は
 * `${it.title} を開く (見積 ${it.estimateMin}分)` / `${it.title} を開く (集中 ${it.estimateMin}分)`
 * で旧 () 区切が残存していた。
 *
 * 修正 (operation-board-widget.tsx):
 *   quick-wins button:
 *     '${it.title} を開く (見積 ${it.estimateMin}分)'
 *   → '${it.title} を開く — 見積 ${it.estimateMin}分'
 *
 *   focus-blocks button:
 *     '${it.title} を開く (集中 ${it.estimateMin}分)'
 *   → '${it.title} を開く — 集中 ${it.estimateMin}分'
 *
 * visible-prefix `${it.title}` は無変更 (voice control prefix-matching 維持)、
 * descriptive 区切のみ em-dash 化。region/role landmark の paren aria-label (line 96 等)
 * は landmark vocab convention で touch しない。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-operation-board-quickwins-em-dash-iter1493.ts
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
  const filePath = resolve(here, '../src/components/workspace/operation-board-widget.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 1. quick-wins button em-dash 新形式
  if (!src.includes('aria-label={`${it.title} を開く — 見積 ${it.estimateMin}分`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'operation-board-widget quick-wins button aria-label が em-dash 形式 "を開く — 見積 ..." でない',
    })
  }
  // 1b. 旧 () 残存
  if (src.includes('aria-label={`${it.title} を開く (見積 ${it.estimateMin}分)`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board-widget quick-wins button 旧 () 区切 aria-label が残存',
    })
  }

  // 2. focus-blocks button em-dash 新形式
  if (!src.includes('aria-label={`${it.title} を開く — 集中 ${it.estimateMin}分`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'operation-board-widget focus-blocks button aria-label が em-dash 形式 "を開く — 集中 ..." でない',
    })
  }
  // 2b. 旧 () 残存
  if (src.includes('aria-label={`${it.title} を開く (集中 ${it.estimateMin}分)`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board-widget focus-blocks button 旧 () 区切 aria-label が残存',
    })
  }

  // 3. region landmark aria-label (line 96) は landmark vocab convention で paren 維持
  // (regression invariant)
  if (
    !src.includes(
      'aria-label={`今日の作戦盤 (期限超過 ${board.overdue.total} 件 / 今日 MUST ${board.mustToday.count} 件 / 今日予定 ${board.todayScheduled.count} 件)`}',
    )
  ) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'operation-board-widget region landmark aria-label が破壊された (paren 維持想定)',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — operation-board-widget quick-wins / focus-blocks button aria-label が em-dash convention 統一済',
    )
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
