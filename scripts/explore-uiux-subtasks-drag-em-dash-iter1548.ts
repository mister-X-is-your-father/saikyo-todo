/**
 * Phase 6.15 loop iter1548: subtasks-panel drag handle aria-label を em-dash 形式に
 * migration (iter1093-1547 sweep convention 着地)。
 *
 * 旧 aria-label `"「${item.title}」をドラッグで並び替え"` は ' を' 助詞接続で iter1093-1547
 * sweep の em-dash 区切と divergent (iter1541 inbox-row / iter1542 operation-board row
 * と同 ${title} 系 pattern)。gantt-view drag handle (` — ドラッグで期間移動`) と em-dash
 * convention 統一。
 *
 * 修正 (subtasks-panel.tsx):
 *   `「${item.title}」をドラッグで並び替え` → `「${item.title}」 — ドラッグで並び替え`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-drag-em-dash-iter1548.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')

  if (!src.includes('aria-label={`「${item.title}」 — ドラッグで並び替え`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel drag handle aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`「${item.title}」をドラッグで並び替え`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel drag handle 旧を助詞接続形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — subtasks-panel drag handle aria-label が em-dash 形式')
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
