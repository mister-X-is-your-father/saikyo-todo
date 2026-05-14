/**
 * Phase 6.15 loop iter871 — dashboard-view.tsx の MUST title button visible {item.title} を
 * aria-hidden span で wrap した regression guard。
 *
 * aria-label="MUST「${item.title}」を編集" が既に item.title を含むため、visible 子 text
 * との重複読み上げ排除。
 *
 *   pnpm tsx scripts/explore-uiux-dashboard-must-title-aria-hidden-iter871.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/dashboard-view.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  // Pattern: aria-label={`MUST「${item.title}」を編集`} → <span aria-hidden="true">{item.title}</span>
  if (
    !/aria-label=\{`MUST「\$\{item\.title\}」を編集`\}[\s\S]{0,80}<span aria-hidden="true">\{item\.title\}<\/span>/.test(
      src,
    )
  ) {
    findings.push({
      level: 'error',
      message: 'dashboard MUST title button visible {item.title} の aria-hidden wrap が無い',
    })
  }

  // data-testid 健在
  if (!src.includes('data-testid={`dashboard-must-title-${item.id}`}')) {
    findings.push({
      level: 'error',
      message: 'data-testid="dashboard-must-title-${item.id}" 健在性 NG',
    })
  }

  console.log(`\n=== Findings (dashboard-must-title-aria-hidden iter871) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
