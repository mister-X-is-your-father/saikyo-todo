/**
 * Phase 6.15 loop iter872 — time-entries-table.tsx Sync button + time-entries-panel.tsx
 * 作成フォームへ button visible text を aria-hidden span で wrap した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-time-entry-buttons-aria-hidden-iter872.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const tbl = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (
    !/<span aria-hidden="true">\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}<\/span>/.test(
      tbl,
    )
  ) {
    findings.push({ level: 'error', message: 'Sync button visible wrap が無い' })
  }

  const pnl = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-panel.tsx'),
    'utf8',
  )
  if (
    !/aria-label="稼働記録 作成フォームの『勤務日』入力欄にフォーカス"[\s\S]*?<span aria-hidden="true">作成フォームへ<\/span>/.test(
      pnl,
    )
  ) {
    findings.push({ level: 'error', message: '作成フォームへ button visible wrap が無い' })
  }

  console.log(`\n=== Findings (time-entry-buttons-aria-hidden iter872) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
