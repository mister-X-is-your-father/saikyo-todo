/**
 * Phase 6.15 loop iter1556: items-board filter-must inactive path aria-label を
 * em-dash 形式に統一 (iter1093-1555 sweep convention 着地)。
 *
 * 旧 inactive path `'MUST のみ表示に絞り込む'` は ' に' 助詞接続で iter1093-1555 sweep の
 * em-dash 区切と divergent。active path (`'MUST のみ表示中 — クリックで解除'`) は既に em-dash
 * convention。両 path で visible "MUST のみ" 冒頭は維持 (voice control)。
 *
 * 修正 (items-board.tsx):
 *   inactive: "MUST のみ表示に絞り込む" → "MUST のみ — 表示に絞り込む"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-items-board-filter-must-em-dash-iter1556.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')

  if (!src.includes("'MUST のみ — 表示に絞り込む'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'filter-must inactive path が em-dash 形式でない',
    })
  }
  if (src.includes("'MUST のみ表示に絞り込む'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'filter-must inactive 旧 に-助詞接続が残存',
    })
  }
  if (!src.includes("'MUST のみ表示中 — クリックで解除'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'filter-must active path em-dash convention が崩れた (regression)',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — items-board filter-must 両 path が em-dash 形式')
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
