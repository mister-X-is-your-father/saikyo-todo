/**
 * Phase 6.15 loop iter2379: subtasks-progress-summary に title 付与し aria-label
 * dynamic と sync。gantt-summary group iter2353 と同 dynamic status summary title
 * sync pattern を subtasks-progress-summary にも展開、SR / sighted / hover の 3
 * path で同 summary 統一。
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

  const st = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')
  if (!st.includes('iter2379')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel iter2379 marker が無い',
    })
  }
  const expr = (
    st.match(
      /`サマリ — \$\{formatDescendantsActivityHintJa\(descendantsProgress\)\} — \$\{formatDescendantsProgressJa\(descendantsProgress\)\}`/g,
    ) || []
  ).length
  if (expr < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `subtasks-progress-summary expression 出現 ${expr} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — subtasks-progress-summary title sync 完了、dynamic status summary 3 path 統一',
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
