/**
 * Phase 6.15 loop iter2431: wf-run-toggle button に title 付与し aria-label
 * state-dependent 2-path と sync (done-yesterday-toggle iter2311 / activity-detail-toggle
 * iter2293 と同 disclosure toggle title pattern)。
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

  const wp = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (!wp.includes('iter2431')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel iter2431 marker が無い',
    })
  }
  const openText = (
    wp.match(/`\$\{r\.triggerKind\} 実行 \(\$\{formatRunTime\(r\)\}\) — ノード詳細を閉じる`/g) || []
  ).length
  if (openText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-run-toggle open 出現 ${openText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const closedText = (
    wp.match(/`\$\{r\.triggerKind\} 実行 \(\$\{formatRunTime\(r\)\}\) — ノード詳細を表示`/g) || []
  ).length
  if (closedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-run-toggle closed 出現 ${closedText} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — wf-run-toggle button title 2-path sync 完了、disclosure toggle title family 拡張',
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
