/**
 * Phase 6.15 loop iter2325: gantt-hide-done-toggle checkbox に title 付与し
 * aria-label state-dependent 2-path (hideDone ? '隠している (クリックで表示に戻す)'
 * : '現在は表示中') と sync。show-deps-toggle iter2323 と同 Gantt 操作 bar
 * toggle title pattern を hide-done toggle にも展開、Gantt 操作 bar 2 toggle
 * family 完成 (show-deps / hide-done)。
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

  const gantt = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  if (!gantt.includes('iter2325')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-hide-done-toggle iter2325 marker が無い',
    })
  }
  // 2-path 各 text aria-label + title 計 2 出現
  const onText = (gantt.match(/'完了済を隠す — 現在は隠している \(クリックで表示に戻す\)'/g) || [])
    .length
  if (onText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `gantt-hide-done hideDone=true 出現 ${onText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const offText = (gantt.match(/'完了済を隠す — 現在は表示中'/g) || []).length
  if (offText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `gantt-hide-done hideDone=false 出現 ${offText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2323 regression guard
  if (!gantt.includes('iter2323')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2323 gantt-show-deps-toggle title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — gantt-hide-done-toggle title 2-path sync 完了、Gantt 操作 bar 2 toggle (show-deps / hide-done) title family 完成',
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
