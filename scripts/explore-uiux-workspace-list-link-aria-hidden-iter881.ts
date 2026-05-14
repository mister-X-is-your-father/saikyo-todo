/**
 * Phase 6.15 loop iter881 — workspace home (/[workspaceId]) の Workspace 一覧へ戻る Link
 * visible "一覧" を aria-hidden span 化した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-workspace-list-link-aria-hidden-iter881.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/app/(workspace)/[workspaceId]/page.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (
    !/aria-label="Workspace 一覧へ戻る">[\s\S]{0,200}<span aria-hidden="true">一覧<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: '一覧 visible wrap が無い' })
  }

  console.log(`\n=== Findings (workspace-list-link-aria-hidden iter881) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
