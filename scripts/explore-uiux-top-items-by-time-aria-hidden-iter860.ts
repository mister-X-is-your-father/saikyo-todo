/**
 * Phase 6.15 loop iter 860 (mode-D Desktop a11y) —
 * top-items-by-time-chip.tsx top N row 内 visible {label} と {entryCount} 件 span を
 * aria-hidden 化 (iter800-859 sweep の続編)。
 *
 * 課題: top-items-by-time-chip.tsx 行 186-194 の 2 inline span は parent <span>
 *   に aria-label="合計 {label}" (合計時間) / aria-label="{N} 件" (entry 件数) が
 *   完全 content を含むのに、内側 visible text は aria-hidden 無し → SR で重複
 *   読み上げ可能性。TimeEntries panel 常駐の「直近 7 日 稼働ダッシュボード」で
 *   item 別 top 5 行ごとに 2 chip 表示される頻出 chip 群。
 *
 * fix (1 ファイル ~2 行差分):
 *   - {label} span / {row.entryCount} 件 span 各々の内側 visible text を
 *     <span aria-hidden="true"> で wrap
 *
 * mode-M 探索 (副次): Kanban view を iPhone 13 (390x844) で確認 → body
 * scroll OK (doc=390 viewport=390)、view-switcher button 全 44x44 OK、
 * kanban-board は空 workspace で未 render = bug 見つからず。
 *
 * 検証: source-side regex assert + iter735/857/858/859 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ti = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  const hasLabelAria = /aria-label=\{`合計 \$\{label\}`\}/.test(ti)
  const hasLabelHidden = /<span aria-hidden="true">\{label\}<\/span>/.test(ti)
  const hasCountAria = /aria-label=\{`\$\{row\.entryCount\} 件`\}/.test(ti)
  const hasCountHidden = /<span aria-hidden="true">\{row\.entryCount\} 件<\/span>/.test(ti)
  if (hasLabelAria && hasLabelHidden && hasCountAria && hasCountHidden) {
    findings.push({
      level: 'info',
      message: `iter860: top-items-by-time-chip 合計 + 件数 span aria-hidden 化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter860: 不完全 (合計-aria=${hasLabelAria} 合計-hidden=${hasLabelHidden} 件-aria=${hasCountAria} 件-hidden=${hasCountHidden})`,
    })
  }

  // iter859 invariant: taskchute-ticker-summary 5 span aria-hidden 維持
  const tv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (/<span className="font-medium tabular-nums" aria-hidden="true">\s+合計 /.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: taskchute-ticker-summary aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  // iter858 invariant: subtasks-progress-summary activity hint aria-hidden 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (/<div className="text-xs font-medium" aria-hidden="true">/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: subtasks-progress-summary aria-hidden 維持 OK`,
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

  console.log(`\n=== Findings (iter860) ===`)
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
