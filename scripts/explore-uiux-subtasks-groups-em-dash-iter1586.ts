/**
 * Phase 6.15 loop iter1586: subtasks-panel 2 group landmark aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1585 sweep convention 着地)。
 *
 * 同 file 2 group 一括変換:
 *   - subtask-group (line 286): paren → em-dash
 *   - subtasks-list (line 543): paren → em-dash
 *
 * iter1578-1585 paren → em-dash sweep family と同 pattern。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-groups-em-dash-iter1586.ts
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

  if (!src.includes('」 — 子タスク ${grandchildren.length} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtask-group aria-label が em-dash 形式でない',
    })
  }
  if (!src.includes('子タスク 全 ${children.length} 件 — 子孫含め')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-list aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('」 (子タスク ${grandchildren.length} 件)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtask-group 旧 paren convention 残存',
    })
  }
  if (src.includes('子タスク 全 ${children.length} 件 (子孫含め')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-list 旧 paren convention 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — subtasks 2 group aria-label が em-dash 形式')
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
