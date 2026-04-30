/**
 * Phase 6.15 loop iter 467 (mode-D source-side audit) — ItemDecomposeButton
 * + ItemResearchButton を 44x44 化 (mobile sweep 7 件目)。
 *
 * 課題: 2 ファイルそれぞれに `<Button size="sm">` が h-8=32px、Backlog row /
 *   Today row 等で頻繁に表示される AI 操作 button、mobile WCAG 違反。
 *
 * fix: 2 ファイル ~2 行差分。
 *   - 各 Button に `className="min-h-11"` 追加
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const TARGETS = [
    {
      path: 'src/components/workspace/item-decompose-button.tsx',
      label: 'ItemDecomposeButton',
    },
    {
      path: 'src/components/workspace/item-research-button.tsx',
      label: 'ItemResearchButton',
    },
  ]
  for (const t of TARGETS) {
    const src = readFileSync(resolve(process.cwd(), t.path), 'utf8')
    if (/size="sm"\s+className="min-h-11"\s+variant="outline"/.test(src)) {
      findings.push({ level: 'info', message: `${t.label}: min-h-11 OK` })
    } else {
      findings.push({ level: 'warning', message: `${t.label}: min-h-11 不在` })
    }
  }

  console.log(`\n=== Findings (mobile-item-action-buttons-iter467) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
