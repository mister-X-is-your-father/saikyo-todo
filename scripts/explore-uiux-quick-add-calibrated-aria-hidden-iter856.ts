/**
 * Phase 6.15 loop iter 856 (mode-D Desktop a11y) —
 * quick-add.tsx 見積校正後 chip 内 visible "→ {N分}" を aria-hidden span で wrap
 * (iter800-855 sweep の続編、role="img" + aria-label canonical pattern)。
 *
 * 課題: quick-add.tsx 行 232-241 の calibrated chip は parent <span role="img"> に
 *   aria-label="校正後 N分 (+/-X分、中央値 K× 補正)" が完全 content を含むのに、
 *   内側 visible "→ N分" text は aria-hidden 無し。SR ユーザは aria-label を聞いた後、
 *   内側 text が再度読み上げられる AT 実装で重複。Workspace の最頻 entry point
 *   QuickAdd で見積入力時に表示される頻出 chip。iter441 で active-timer-panel と
 *   同 pattern (aria-hidden 済) なので quick-add 側を pattern 統一。
 *
 * fix (1 ファイル ~1 行差分):
 *   - "→ {N分}" visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/853/854/855 invariant cross-check。
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
  const hasAriaLabel =
    /aria-label=\{`校正後 \$\{formatEstimate\(calibrated\.calibratedMinutes\)\}/.test(qa)
  const hasInnerHidden =
    /<span aria-hidden="true">→ \{formatEstimate\(calibrated\.calibratedMinutes\)\}<\/span>/.test(
      qa,
    )
  if (hasAriaLabel && hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `iter856: quick-add 校正後 chip 内 "→ {N分}" aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter856: calibrated chip aria-hidden 不完全 (aria-label=${hasAriaLabel} inner-hidden=${hasInnerHidden})`,
    })
  }

  // parallel reference: active-timer-panel 同 pattern (校正後 chip aria-hidden 済)
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">→ \{calibrated\.calibratedMinutes\}分<\/span>/.test(atp)) {
    findings.push({
      level: 'info',
      message: `iter856 reference: active-timer-panel 校正後 chip も同 pattern (visible "→" aria-hidden)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter856 reference: active-timer-panel 校正後 chip pattern drift`,
    })
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
  if (/aria-label="MUST タスク"/.test(gv) && /<span aria-hidden="true">MUST<\/span>/.test(gv)) {
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

  console.log(`\n=== Findings (iter856) ===`)
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
