/**
 * Phase 6.15 loop iter1182: items-board filter-status select active path aria-label visible-prefix
 * regression guard。
 *
 * iter1182 で発見した iter1068 sweep の active path 漏れ: items-board.tsx `filter-status` select
 * の active path 旧 aria-label `ステータスで絞り込み中 (現在: TODO)。「全ステータス」で解除`
 * は visible (option text "TODO" / "進行中" / "完了") を中位置 "(現在: TODO)" 内に持ち
 * voice control prefix-matching「click TODO」 match 不可 (substring 一致のみ)。
 * iter1068 では未選択 path のみ修正されていた、active path は漏れていた。
 *
 * 修正 (items-board.tsx): IIFE で visible を先に算出し、`${visible} — ...` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-filter-status-active-visible-prefix-iter1182.ts
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
  const filePath = resolve(here, '../src/components/workspace/items-board.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (
    !src.includes(
      '`${visible} — ステータスで絞り込み中 (現在: ${visible})。「全ステータス」で解除`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'filter-status active path が visible-prefix 形式 "${visible} — ..." でない',
    })
  }
  if (src.includes('`ステータスで絞り込み中 (現在: ${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "ステータスで絞り込み中 (現在: ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — filter-status active path も visible 冒頭固定済')
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
