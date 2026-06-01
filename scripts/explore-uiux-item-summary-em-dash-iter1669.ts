/**
 * Phase 6.15 loop iter1669: item-summary-panel role="status" 2 aria-label の colon を em-dash に
 * 統一。iter1626/iter1628 colon → em-dash sweep の補完。
 *
 *   旧: `子タスク進捗: ${X} — ${Y}` / `子タスク進捗: 読み込み中`
 *   新: `子タスク進捗 — ${X} / ${Y}` / `子タスク進捗 — 読み込み中`
 *
 *   旧: `依存: ${X}` / `依存: 読み込み中`
 *   新: `依存 — ${X}` / `依存 — 読み込み中`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-item-summary-em-dash-iter1669.ts
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
    resolve(here, '../src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )

  if (
    !src.includes(
      '`子タスク進捗 — ${formatDescendantsActivityHintJa(progress)} / ${formatDescendantsProgressJa(progress)}`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '子タスク進捗 aria-label em-dash 未着地',
    })
  }
  if (!src.includes("'子タスク進捗 — 読み込み中'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '子タスク進捗 fallback aria-label em-dash 未着地',
    })
  }
  if (!src.includes('`依存 — ${formatDependencyReadiness(readiness)}`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '依存 aria-label em-dash 未着地',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — item-summary-panel role=status aria-label が em-dash 統一')
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
