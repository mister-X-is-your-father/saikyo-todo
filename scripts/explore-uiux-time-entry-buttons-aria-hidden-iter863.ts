/**
 * Phase 6.15 loop iter 863 (mode-D Desktop a11y) —
 * time-entry 2 file 2 button visible text を aria-hidden span で wrap。
 *
 * 課題:
 *   - time-entries-panel.tsx 行 53-65: empty CTA "作成フォームへ"
 *   - time-entries-table.tsx 行 125-142: Sync button visible
 *     "{e.syncStatus === 'failed' ? '再Sync' : 'Sync'}"
 *
 *   いずれも aria-label が完全 content を含むのに visible が aria-hidden 無しで
 *   SR 2 経路読み上げ重複。iter844-862 と同 vocabulary、time-entry domain も
 *   parallel fix。
 *
 * fix (2 ファイル +5/-2 行):
 *   - panel: <span aria-hidden="true">作成フォームへ</span>
 *   - table: <span aria-hidden="true">{...}</span>
 *
 * 検証: source-side regex assert + iter860 / iter861 / iter862 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tep = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-panel.tsx'),
    'utf8',
  )
  const tet = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )

  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tep)) {
    findings.push({
      level: 'info',
      message: `iter863-a: time-entries-panel empty CTA aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter863-a: time-entries-panel empty CTA aria-hidden 不完全`,
    })
  }

  if (
    /<span aria-hidden="true">[\s\S]*?\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}[\s\S]*?<\/span>/.test(
      tet,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter863-b: time-entries-table Sync button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter863-b: time-entries-table Sync button aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / data-testid 維持
  if (
    /aria-label="稼働記録 作成フォームの『勤務日』入力欄にフォーカス"/.test(tep) &&
    /data-testid="time-entries-empty-create"/.test(tep)
  ) {
    findings.push({
      level: 'info',
      message: `iter863 invariant (panel): aria-label / data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant (panel): 破壊` })
  }

  if (/data-testid=\{`time-entry-sync-\$\{e\.id\}`\}/.test(tet)) {
    findings.push({
      level: 'info',
      message: `iter863 invariant (table): data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant (table): 破壊` })
  }

  // iter862 invariant
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">編集<\/span>/.test(wp) &&
    /<span aria-hidden="true">履歴<\/span>/.test(wp)
  ) {
    findings.push({ level: 'info', message: `iter862 invariant: workflows-panel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  console.log(`\n=== Findings (time-entry-buttons-aria-hidden-iter863) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
