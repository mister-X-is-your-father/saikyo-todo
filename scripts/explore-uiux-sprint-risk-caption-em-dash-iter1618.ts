/**
 * Phase 6.15 loop iter1618: sprint-risk-board-widget sr-only caption paren を em-dash 区切に
 * migration (iter1615/1616/1617 sr-only caption sweep family と同 pattern、iter1093-1617 sweep
 * convention 着地)。
 *
 * 旧 sr-only caption `({N} 名 / 担当 / 件数 / MUST 件数 / 負荷スコア合計)` paren convention は
 * iter1093-1617 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (sprint-risk-board-widget.tsx):
 *   `担当者ごとの負荷一覧 (${N} 名 / 担当 / 件数 / MUST 件数 / 負荷スコア合計)` →
 *   `担当者ごとの負荷一覧 — ${N} 名 / 担当 / 件数 / MUST 件数 / 負荷スコア合計`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-risk-caption-em-dash-iter1618.ts
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
    resolve(here, '../src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )

  if (
    !src.includes(
      '担当者ごとの負荷一覧 — {loadEntries.length} 名 / 担当 / 件数 / MUST 件数 / 負荷スコア合計',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-risk-board caption が em-dash 区切でない',
    })
  }
  if (
    src.includes(
      '担当者ごとの負荷一覧 ({loadEntries.length} 名 / 担当 / 件数 / MUST 件数 / 負荷スコア合計)',
    ) ||
    src.includes('担当者ごとの負荷一覧 ({loadEntries.length} 名 / 担当 / 件数 / MUST 件数 /')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-risk-board caption 旧 paren 区切が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-risk-board caption が em-dash 区切')
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
