/**
 * Phase 6.15 loop iter1599: subtasks-panel subtasks-progress-summary aria-label の 先頭 colon を
 * em-dash 区切に migration (iter1093-1598 sweep convention 着地)。
 *
 * 旧 aria-label `"サマリ: X — Y"` の先頭 colon `:` は iter1093-1598 sweep の em-dash 区切と
 * divergent (内部は既に em-dash 化済)。`サマリ:` colon を ` — ` em-dash に統一。
 *
 * 修正 (subtasks-panel.tsx):
 *   `サマリ: ${activityHint} — ${progress}` → `サマリ — ${activityHint} — ${progress}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-summary-em-dash-iter1599.ts
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

  if (
    !src.includes('aria-label={`サマリ — ${formatDescendantsActivityHintJa(descendantsProgress)}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-progress-summary aria-label 先頭が em-dash 区切でない',
    })
  }
  if (
    src.includes('aria-label={`サマリ: ${formatDescendantsActivityHintJa(descendantsProgress)}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-progress-summary 旧 colon 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — subtasks-progress-summary aria-label 先頭 em-dash 区切')
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
