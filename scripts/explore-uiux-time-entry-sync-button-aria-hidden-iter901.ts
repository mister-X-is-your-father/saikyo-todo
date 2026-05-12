/**
 * Phase 6.15 loop iter 901 (mode-D Desktop a11y) —
 * time-entries-table.tsx Sync / 再Sync button 内 visible を aria-hidden span で
 * wrap (iter800-900 sweep の続編、time-entries 完結 sweep)。
 *
 * 課題: time-entries-table.tsx 行 133-142 の time-entry-sync button は
 *   aria-label が完全 content (description + workDate + 動作 + 状態) を含むのに、
 *   内側 visible "{再Sync / Sync}" は aria-hidden 無し → SR で二重読み可能性。
 *   Time Entries テーブルの各 row の同期 button。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "{e.syncStatus === 'failed' ? '再Sync' : 'Sync'}" を
 *     <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/898/899/900 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tt = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}<\/span>/.test(tt)
  ) {
    findings.push({
      level: 'info',
      message: `iter901: time-entry sync button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter901: time-entry sync aria-hidden 不在`,
    })
  }

  // iter900 invariant: quick-add preview title aria-hidden 維持
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/<span className="truncate font-mono" aria-hidden="true">\s+→ \{preview\.title\}/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter900 invariant: quick-add preview title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter900 invariant: 破壊` })
  }

  // iter899 invariant: proposal edit buttons aria-hidden 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-cancel`\}[\s\S]*?<span aria-hidden="true">キャンセル<\/span>/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter899 invariant: proposal edit buttons aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter899 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter901) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
