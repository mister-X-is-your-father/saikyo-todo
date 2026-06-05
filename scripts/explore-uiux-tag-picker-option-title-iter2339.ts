/**
 * Phase 6.15 loop iter2339: tag-picker option CommandItem に title 付与し
 * aria-label state-dependent 2-path (checked / unchecked) と sync。
 * assignee-picker user CommandItem iter2335 と同 pattern を tag-picker option
 * にも展開、CommandItem 2 option family 完成。
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

  const tp = readFileSync(resolve(here, '../src/components/workspace/tag-picker.tsx'), 'utf8')
  if (!tp.includes('iter2339')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tag-picker iter2339 marker が無い',
    })
  }
  // option 2-path aria + title 計 4 expression 出現 (各 aria + title)
  const optExpr = (
    tp.match(
      /checked \? `\$\{t\.name\} — タグ付与中 \(クリックで解除\)` : `\$\{t\.name\} — タグを付与`/g,
    ) || []
  ).length
  if (optExpr < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tag-picker option ternary 出現 ${optExpr} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2337 regression guard
  const sl = readFileSync(
    resolve(here, '../src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (!sl.includes('iter2337')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2337 Sprint swim-lane root group title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — tag-picker option title 2-path sync 完了、CommandItem option 2 picker family 完成',
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
