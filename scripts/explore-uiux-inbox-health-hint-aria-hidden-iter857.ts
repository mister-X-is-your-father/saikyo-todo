/**
 * Phase 6.15 loop iter 857 (mode-D Desktop a11y) —
 * inbox-view.tsx Inbox health hint chip 内 visible "{label}" を aria-hidden span で
 * wrap (iter800-856 sweep の続編)。
 *
 * 課題: inbox-view.tsx 行 114-121 の health hint chip は parent <span> に
 *   aria-label="Inbox 健全性: {label}" が完全 content を含むのに、内側 visible
 *   "{healthChip.label}" text は aria-hidden 無し。SR ユーザは aria-label を聞いた後、
 *   内側 text が再度読み上げられる AT 実装で重複。Inbox view は GTD workflow の
 *   起点 view で常時可視。
 *
 * fix (1 ファイル ~1 行差分):
 *   - "{healthChip.label}" visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/854/855/856 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  const hasAriaLabel = /aria-label=\{`Inbox 健全性: \$\{healthChip\.label\}`\}/.test(iv)
  const hasInnerHidden = /<span aria-hidden="true">\{healthChip\.label\}<\/span>/.test(iv)
  if (hasAriaLabel && hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `iter857: inbox-view health hint chip 内 "{label}" aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter857: health hint chip aria-hidden 不完全 (aria-label=${hasAriaLabel} inner-hidden=${hasInnerHidden})`,
    })
  }

  // iter856 invariant: quick-add calibrated chip aria-hidden span 維持
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
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{grandchildren\.length\} 件<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: subtasks-panel childcount aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
  }

  // iter854 invariant: gantt-view MUST badge aria-hidden span 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">MUST<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: gantt-view MUST badge aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter857) ===`)
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
