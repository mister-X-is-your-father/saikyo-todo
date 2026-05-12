/**
 * Phase 6.15 loop iter 902 (mode-D Desktop a11y) —
 * time-entries-panel.tsx empty state 「作成フォームへ」 button 内 visible を
 * aria-hidden span で wrap (iter800-901 sweep の続編、empty state CTA 完結 sweep)。
 *
 * 課題: time-entries-panel.tsx 行 53-65 の time-entries-empty-create button は
 *   aria-label "稼働記録 作成フォームの『勤務日』入力欄にフォーカス" を持つのに、
 *   内側 visible "作成フォームへ" は aria-hidden 無し → SR で重複読み上げ可能性。
 *   Time Entries page 空状態の CTA。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "作成フォームへ" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/899/900/901 invariant cross-check。
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
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tep)) {
    findings.push({
      level: 'info',
      message: `iter902: time-entries-empty-create button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter902: time-entries-empty-create aria-hidden 不在`,
    })
  }

  // iter901 invariant: time-entry-sync button aria-hidden 維持
  const tt = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}<\/span>/.test(tt)
  ) {
    findings.push({
      level: 'info',
      message: `iter901 invariant: time-entry-sync button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter901 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter902) ===`)
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
