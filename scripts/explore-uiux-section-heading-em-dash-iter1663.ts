/**
 * Phase 6.15 loop iter1663: operation-board-widget Section component の h3 count span を
 * `(${N})` paren convention から em-dash + 件 convention に統一。iter1662 続編。
 *
 *   旧: `<span>({count})</span>` (visible: "今日の MUST (1)" / "今日の予定 (2)" / 等)
 *   新: `<span> — {count} 件</span>` (visible: "今日の MUST — 1 件" / "今日の予定 — 2 件")
 *
 * Section component は operation-board の sub-section (推奨/期限超過/MUST/予定/昨日 done)
 * で再利用される heading wrapper、全 sub-section で format 統一。leading space は
 * `{' — '}` JSX literal で確保 (concat 時 trimming 抑制)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-section-heading-em-dash-iter1663.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  if (!src.includes("{' — '}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Section em-dash leading space literal が無い',
    })
  }
  if (!src.includes('{count} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Section em-dash 件 単位が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — Section component count が em-dash convention で統一')
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
