/**
 * Phase 6.15 loop iter877 — operation-board-widget の 2 quick-wins/focus button + taskchute-view
 * の title button visible {it.title} / {item.title} を aria-hidden span 化した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-operation-taskchute-title-aria-hidden-iter877.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  // 2 button (quick-wins + focus-blocks): inner truncate span に aria-hidden が必要
  const ahTitleCount = (ob.match(/<span className="truncate" aria-hidden="true">/g) ?? []).length
  if (ahTitleCount < 2) {
    findings.push({
      level: 'error',
      message: `operation-board truncate title span aria-hidden が ${ahTitleCount} < 2`,
    })
  }
  // estimateMin span にも aria-hidden が必要 (visible text 重複)
  const ahMinCount = (ob.match(/text-\[10px\] tabular-nums"\n\s*aria-hidden="true"/g) ?? []).length
  if (ahMinCount < 2) {
    findings.push({
      level: 'error',
      message: `operation-board estimateMin span aria-hidden が ${ahMinCount} < 2`,
    })
  }

  const tv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (
    !/aria-label=\{`\$\{item\.title\} を編集`\}[\s\S]{0,80}<span aria-hidden="true">\{item\.title\}<\/span>/.test(
      tv,
    )
  ) {
    findings.push({ level: 'error', message: 'taskchute-view title button visible wrap が無い' })
  }

  console.log(`\n=== Findings (operation-taskchute-title-aria-hidden iter877) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
