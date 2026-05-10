/**
 * Phase 6.15 loop iter 882 (mode-D Desktop a11y) —
 * quick-add submit button visible '...' (3 dots ASCII) → '作成中…' (Unicode '…')
 * 統一 で WCAG 2.5.3 (Label in Name) 適合化。
 *
 * 課題: src/components/workspace/quick-add.tsx の quick-add-submit button:
 *   - visible '...' (3 dots ASCII) は aria-label "「{title}」を作成中…" (Unicode '…')
 *     と最後 char 異なり substring 不適合 (iter879/881 と同 Unicode ellipsis pattern)
 *   - すでに span aria-hidden 統合は iter848 で済 (ただし visible '...' は残存)
 *
 * fix (1 ファイル / +1-1 行差分):
 *   - visible '...' → '作成中…' (Unicode 統一、aria-label と一致)
 *
 * 検証: source-side regex assert + iter879-881 invariant cross-check
 * (Unicode ellipsis fix の 3 例目: create-time-entry-submit / mock-submit-form / quick-add-submit)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')

  // 1. visible '作成中…' (Unicode) / '作成' span aria-hidden
  if (/<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/.test(qa)) {
    findings.push({
      level: 'info',
      message: `quick-add visible '作成中…/作成' span aria-hidden + Unicode 統一 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add visible aria-hidden 未統合 or Unicode 未統一`,
    })
  }

  // 2. 旧 visible '...' (3 dots) 削除
  if (!/'\.\.\.' : '作成'/.test(qa)) {
    findings.push({
      level: 'info',
      message: `quick-add 旧 visible '...' (3 dots) 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add 旧 visible '...' (3 dots) 残存`,
    })
  }

  // 3. aria-label pending '作成中…' (Unicode) 維持
  if (/`「\$\{preview\.title\}」を作成中…`/.test(qa)) {
    findings.push({
      level: 'info',
      message: `quick-add aria-label pending '作成中…' (Unicode) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add aria-label pending '作成中…' 破壊`,
    })
  }

  // iter881 invariant: mock-submit Unicode ellipsis 統一
  const ms = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '送信中…' : '送信'\}<\/span>/.test(ms)) {
    findings.push({
      level: 'info',
      message: `iter881 invariant: mock-submit Unicode ellipsis 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter881 invariant: mock-submit 破壊` })
  }

  // iter879 invariant: create-time-entry-submit Unicode ellipsis
  const cf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '記録中…' : '記録'\}<\/span>/.test(cf)) {
    findings.push({
      level: 'info',
      message: `iter879 invariant: create-time-entry-submit Unicode ellipsis 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter879 invariant: create-time-entry-submit 破壊` })
  }

  console.log(`\n=== Findings (quick-add-ellipsis-iter882) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
