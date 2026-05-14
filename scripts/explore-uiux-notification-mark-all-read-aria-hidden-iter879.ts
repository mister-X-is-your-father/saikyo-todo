/**
 * Phase 6.15 loop iter879 — notification-bell.tsx の 全て既読 button visible "全て既読" を
 * aria-hidden span で wrap した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-notification-mark-all-read-aria-hidden-iter879.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/notification-bell.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (!/<span aria-hidden="true">全て既読<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '全て既読 button visible wrap が無い' })
  }

  // 既存 wrap regression (hint / unreadBreakdown)
  if (!/<span aria-hidden="true">\{hint\.label\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '既存 hint.label wrap が消えた (regression)' })
  }
  if (!/<span aria-hidden="true">\{unreadBreakdown\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '既存 unreadBreakdown wrap が消えた (regression)' })
  }

  console.log(`\n=== Findings (notification-mark-all-read-aria-hidden iter879) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
