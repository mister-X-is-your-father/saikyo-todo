/**
 * Phase 6.15 loop iter 858 (mode-D Desktop a11y) —
 * subtasks-panel.tsx descendants progress summary chip 内 activity hint div も
 * aria-hidden 化 (iter800-857 sweep の続編、対称化 fix)。
 *
 * 課題: subtasks-panel.tsx 行 449-462 の subtasks-progress-summary は parent <div>
 *   に role="status" + aria-label="サマリ: {ActivityHint} — {Progress}" が完全
 *   content を含み、内側 2 行 (activity hint / progress) のうち 2 行目は
 *   aria-hidden 済だが 1 行目 (activity hint div) は aria-hidden 無し → SR で
 *   重複読み上げ可能性 (aria-label と内側 text 両方 SR 受信)。Item edit dialog
 *   の 子タスク tab summary chip で頻出。
 *
 * fix (1 ファイル ~1 行差分):
 *   - activity hint div に aria-hidden="true" 追加 (内側 emoji span の冗長
 *     aria-hidden は親で吸収するため削除、簡潔化)
 *
 * 検証: source-side regex assert + iter735/855/856/857 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  const hasAriaLabel = /aria-label=\{`サマリ: \$\{formatDescendantsActivityHintJa/.test(sp)
  const activityHidden = /<div className="text-xs font-medium" aria-hidden="true">/.test(sp)
  const progressHidden =
    /<div className="text-muted-foreground mt-0\.5 text-\[11px\]" aria-hidden="true">/.test(sp)
  if (hasAriaLabel && activityHidden && progressHidden) {
    findings.push({
      level: 'info',
      message: `iter858: subtasks-progress-summary activity + progress 両 div aria-hidden 化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter858: 不完全 (aria-label=${hasAriaLabel} activity=${activityHidden} progress=${progressHidden})`,
    })
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

  // iter855 invariant: subtasks-panel childcount aria-hidden span 維持
  if (/<span aria-hidden="true">\{grandchildren\.length\} 件<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: subtasks-panel childcount aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter858) ===`)
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
