/**
 * Phase 6.15 loop iter880 — bulk-action-bar.tsx の 2 button (status 変更 + 解除) visible
 * text を aria-hidden span で wrap した regression guard。iter850 (削除) と合わせて
 * BulkActionBar 内 3 button 全段で wrap 統一。
 *
 *   pnpm tsx scripts/explore-uiux-bulk-action-bar-aria-hidden-iter880.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/bulk-action-bar.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (!/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(src)) {
    findings.push({ level: 'error', message: 'status 変更 button visible wrap が無い' })
  }
  if (!/aria-label="選択を解除"[\s\S]{0,80}<span aria-hidden="true">解除<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '解除 button visible wrap が無い' })
  }
  // iter850 既存
  if (!/<span aria-hidden="true">削除<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '既存 削除 button wrap (iter850) が消えた' })
  }

  console.log(`\n=== Findings (bulk-action-bar-aria-hidden iter880) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
