/**
 * Phase 6.15 loop iter868 — 3 disclosure / navigation button visible text を aria-hidden
 * span で wrap した regression guard。
 *
 * 対象:
 *   1. gantt-view 今日へジャンプ button — "今日へジャンプ"
 *   2. activity-log 詳細を見る/閉じる disclosure — `{open ? '詳細を閉じる' : '詳細を見る'}`
 *   3. operation-board-widget 昨日 done disclosure — "昨日 done {count} 件"
 *
 * 3 件とも aria-label に意図 + context (今日の日付 / 対象 entry label / count) を完全表現。
 *
 *   pnpm tsx scripts/explore-uiux-disclosure-buttons-aria-hidden-iter868.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function check(file: string, pat: RegExp, msg: string, findings: Finding[]): void {
  const src = readFileSync(resolve(process.cwd(), file), 'utf8')
  if (!pat.test(src)) findings.push({ level: 'error', message: `${file}: ${msg}` })
}

function main(): void {
  const findings: Finding[] = []

  check(
    'src/components/workspace/gantt-view.tsx',
    /<span aria-hidden="true">今日へジャンプ<\/span>/,
    'gantt 今日へジャンプ wrap が無い',
    findings,
  )
  check(
    'src/components/workspace/activity-log.tsx',
    /<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/,
    'activity-log 詳細 disclosure wrap が無い',
    findings,
  )
  check(
    'src/components/workspace/operation-board-widget.tsx',
    /<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/,
    'operation-board 昨日 done wrap が無い',
    findings,
  )

  console.log(`\n=== Findings (disclosure-buttons-aria-hidden iter868) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
