/**
 * Phase 6.15 loop iter874 — today-view + kanban-view の Item title button visible
 * {item.title} (or {it.title}) を aria-hidden span で wrap した regression guard。
 * iter871 (dashboard MUST title) と同 pattern を Today / Kanban 主要 view にも展開。
 *
 *   pnpm tsx scripts/explore-uiux-today-kanban-title-aria-hidden-iter874.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (
    !/data-testid=\{`today-title-\$\{it\.id\}`\}[\s\S]{0,80}aria-label=\{`「\$\{it\.title\}」を編集`\}[\s\S]{0,80}<span aria-hidden="true">\{it\.title\}<\/span>/.test(
      tv,
    )
  ) {
    findings.push({ level: 'error', message: 'today-view title button visible wrap が無い' })
  }

  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (
    !/data-testid=\{`kanban-title-\$\{item\.id\}`\}[\s\S]{0,200}aria-label=\{`「\$\{item\.title\}」を編集`\}[\s\S]{0,400}<span aria-hidden="true">\{item\.title\}<\/span>/.test(
      kv,
    )
  ) {
    findings.push({ level: 'error', message: 'kanban-view title button visible wrap が無い' })
  }

  console.log(`\n=== Findings (today-kanban-title-aria-hidden iter874) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
