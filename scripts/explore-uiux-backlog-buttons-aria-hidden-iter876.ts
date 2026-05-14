/**
 * Phase 6.15 loop iter876 — backlog-view.tsx の 2 button (title button + 編集 button)
 * visible text を aria-hidden span で wrap した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-backlog-buttons-aria-hidden-iter876.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/backlog-view.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  // title button: visible {String(getValue())} を span aria-hidden で wrap
  if (!/<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: 'backlog title button visible wrap が無い' })
  }
  // 編集 button: visible "編集" を span aria-hidden で wrap
  if (
    !/aria-label=\{`「\$\{row\.original\.title\}」を編集`\}[\s\S]{0,80}<span aria-hidden="true">編集<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: 'backlog 編集 button visible wrap が無い' })
  }

  console.log(`\n=== Findings (backlog-buttons-aria-hidden iter876) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
