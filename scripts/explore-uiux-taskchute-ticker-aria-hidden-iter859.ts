/**
 * Phase 6.15 loop iter 859 (mode-D Desktop a11y) —
 * taskchute-view.tsx taskchute-ticker-summary chip 内 5 visible span
 * (合計 / 完了 / 残) を aria-hidden 化 (iter800-858 sweep の続編)。
 *
 * 課題: taskchute-view.tsx 行 118-142 の taskchute-ticker-summary chip は parent
 *   <div role="status"> に aria-label="合計 N 分 / 完了済 N 分 / 残 N 分" が完全
 *   content を含むのに、内側 5 visible span (合計 / 完了 / 残 各 label + 数値) は
 *   aria-hidden 無し → SR で重複読み上げ可能性。TaskChute mode は今日の 1 列
 *   timeline で常時可視。conditional "見積無 N" span は aria-label に含まれない
 *   独立情報なので維持 (aria-hidden 化しない)。
 *
 * fix (1 ファイル ~5 行差分):
 *   - "合計 Nh Nm" span / "/ 完了" span / 完了済 数値 span / "/ 残" span /
 *     残 数値 span 各々に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735/856/857/858 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  const hasAriaLabel = /aria-label=\{`合計 \$\{ticker\.totalEstimateMin\} 分 \/ 完了済 /.test(tv)
  const totalHidden = /<span className="font-medium tabular-nums" aria-hidden="true">\s+合計 /.test(
    tv,
  )
  const doneLabelHidden =
    /<span className="text-muted-foreground" aria-hidden="true">\s+\/ 完了/.test(tv)
  const remLabelHidden = /<span className="text-muted-foreground" aria-hidden="true">\s+\/ 残/.test(
    tv,
  )
  if (hasAriaLabel && totalHidden && doneLabelHidden && remLabelHidden) {
    findings.push({
      level: 'info',
      message: `iter859: taskchute-ticker-summary 5 span aria-hidden 化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter859: 不完全 (aria-label=${hasAriaLabel} total=${totalHidden} doneLabel=${doneLabelHidden} remLabel=${remLabelHidden})`,
    })
  }

  // iter858 invariant: subtasks-progress-summary activity hint aria-hidden 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (/<div className="text-xs font-medium" aria-hidden="true">/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: subtasks-progress-summary activity hint aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter857 invariant: inbox-view health hint aria-hidden span 維持
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{healthChip\.label\}<\/span>/.test(iv)) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: inbox-view health hint aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter856 invariant: quick-add calibrated aria-hidden span 維持
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (
    /<span aria-hidden="true">→ \{formatEstimate\(calibrated\.calibratedMinutes\)\}<\/span>/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: quick-add calibrated aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter859) ===`)
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
