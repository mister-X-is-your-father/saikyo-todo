/**
 * Phase 6.15 loop iter895 — checkbox label visible text の aria-hidden span 化 regression
 * guard (iter885 / iter886 / iter887 / iter888 / iter889 / iter890 を一括検証)。
 *
 * 対象 6 file:
 *   - items-board.tsx (MUST のみ)
 *   - gantt-view.tsx (依存線 / 完了済を隠す / zoom)
 *   - engineer-trigger-button.tsx (PR 自動起票)
 *   - item-edit-dialog.tsx (MUST / 絶対落とさない)
 *   - template-items-editor.tsx (MUST (絶対落とさない))
 *   - decompose-proposals-panel.tsx (MUST)
 *
 *   pnpm tsx scripts/explore-uiux-checkbox-labels-aria-hidden-iter895.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

interface Spec {
  file: string
  label: string
  pattern: RegExp
}

const SPECS: Spec[] = [
  {
    file: 'src/components/workspace/items-board.tsx',
    label: 'items-board MUST のみ',
    pattern: /aria-label=\{must \?[^}]+\}[\s\S]{0,100}<span aria-hidden="true">MUST のみ<\/span>/,
  },
  {
    file: 'src/components/workspace/gantt-view.tsx',
    label: 'gantt-view 依存線',
    pattern: /<span aria-hidden="true">依存線<\/span>/,
  },
  {
    file: 'src/components/workspace/gantt-view.tsx',
    label: 'gantt-view 完了済を隠す',
    pattern: /<span aria-hidden="true">完了済を隠す<\/span>/,
  },
  {
    file: 'src/components/workspace/gantt-view.tsx',
    label: 'gantt-view zoom',
    pattern: /<span className="text-muted-foreground" aria-hidden="true">\s*zoom\s*<\/span>/,
  },
  {
    file: 'src/components/workspace/engineer-trigger-button.tsx',
    label: 'engineer-trigger PR 自動起票',
    pattern: /<span className="text-muted-foreground" aria-hidden="true">\s*PR 自動起票\s*<\/span>/,
  },
  {
    file: 'src/components/workspace/item-edit-dialog.tsx',
    label: 'item-edit-dialog MUST + (絶対落とさない)',
    pattern:
      /<span className="font-medium text-red-700" aria-hidden="true">\s*MUST\s*<\/span>\s*<span className="text-muted-foreground text-xs" aria-hidden="true">\s*\(絶対落とさない\)\s*<\/span>/,
  },
  {
    file: 'src/components/template/template-items-editor.tsx',
    label: 'template-items-editor MUST (絶対落とさない)',
    pattern: /<span aria-hidden="true">MUST \(絶対落とさない\)<\/span>/,
  },
  {
    file: 'src/components/workspace/decompose-proposals-panel.tsx',
    label: 'decompose-proposals MUST',
    pattern: /<span className="font-medium text-red-700" aria-hidden="true">\s*MUST\s*<\/span>/,
  },
]

function main(): void {
  const findings: Finding[] = []
  for (const spec of SPECS) {
    const src = readFileSync(resolve(process.cwd(), spec.file), 'utf8')
    if (!spec.pattern.test(src)) {
      findings.push({
        level: 'error',
        message: `${spec.label} (${spec.file}): aria-hidden span wrap が無い`,
      })
    }
  }

  console.log(`\n=== Findings (checkbox-labels-aria-hidden iter895) ===`)
  if (findings.length === 0)
    console.log(
      `(なし) 期待どおり全 ${SPECS.length} invariant OK (static grep verify, iter885-890 集約)`,
    )
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
