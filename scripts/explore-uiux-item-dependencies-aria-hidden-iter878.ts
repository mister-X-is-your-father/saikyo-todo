/**
 * Phase 6.15 loop iter878 — item-dependencies-panel.tsx の 2 button (追加 + 解除) visible
 * text を aria-hidden span で wrap した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-item-dependencies-aria-hidden-iter878.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/item-dependencies-panel.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (!/<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '依存追加 button visible wrap が無い' })
  }
  if (!/<span aria-hidden="true">解除<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '依存解除 button visible wrap が無い' })
  }

  console.log(`\n=== Findings (item-dependencies-aria-hidden iter878) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
