/**
 * Phase 6.15 loop iter 453 (mode-D Desktop a11y) — workflows-panel の 2 ul に
 * aria-label を追加 (widget heading 統一 累計 18-19 件目)、codify。
 *
 * 課題: src/components/workflow/workflows-panel.tsx
 *   1. <ul data-testid="workflows-list">: Workflow card 一覧
 *   2. <ul data-testid={`wf-node-runs-${runId}`}>: Workflow node 実行履歴
 *
 * fix: 1 ファイル ~6 行差分。
 *   - workflows-list: `aria-label="Workflow 一覧 ${list.data!.length} 件"`
 *   - wf-node-runs: `aria-label="Workflow node 実行履歴 ${rows.length} 件"`
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workflow/workflows-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  if (/aria-label=\{`Workflow 一覧 \$\{list\.data!\.length\} 件`\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: workflows-list aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: workflows-list aria-label 不在` })
  }

  if (/aria-label=\{`Workflow node 実行履歴 \$\{rows\.length\} 件`\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: wf-node-runs aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: wf-node-runs aria-label 不在` })
  }

  console.log(`\n=== Findings (workflows-list-aria-iter453) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
