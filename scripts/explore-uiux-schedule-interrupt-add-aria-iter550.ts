/**
 * Phase 6.15 loop iter 550 (mode-D Desktop a11y) —
 * ScheduleItemPicker 「割込みとして追加」 Button に aria-label + data-testid を補完。
 *
 * 課題: schedule-item-picker.tsx 行 103-110 の interrupt add Button は
 *   visible text "割込みとして追加" のみで aria-label / data-testid 不在。SR は
 *   メモ入力済の状態でも "割込みとして追加 ボタン" を聞くだけで何が登録されるか
 *   わからない。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label={`割込み / 休憩として追加${interruptNote ? ` (メモ: ${interruptNote})` : ''}`}
 *   - data-testid="schedule-picker-interrupt-add"
 *
 * +2 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、type=button / variant /
 * className / onClick invariant 維持、iter545 schedule-picker-cancel と pair で
 * picker 内全 button を SR-friendly に。
 *
 * 検証: source-side regex assert + iter515-549 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )

  // 1. interrupt-add aria-label + data-testid
  if (
    /data-testid="schedule-picker-interrupt-add"\s+aria-label=\{`割込み \/ 休憩として追加\$\{interruptNote \? ` \(メモ: \$\{interruptNote\}\)` : ''\}`\}/.test(
      sip,
    ) ||
    /aria-label=\{`割込み \/ 休憩として追加\$\{interruptNote \? ` \(メモ: \$\{interruptNote\}\)` : ''\}`\}\s+data-testid="schedule-picker-interrupt-add"/.test(
      sip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker.tsx: interrupt-add aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker.tsx: interrupt-add aria-label / data-testid 不在`,
    })
  }

  // 2. iter545 invariant: schedule-picker-cancel aria-label 維持
  if (
    /aria-label="task pick をキャンセル"/.test(sip) &&
    /data-testid="schedule-picker-cancel"/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `iter545 invariant: schedule-picker-cancel aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter545 invariant: 破壊`,
    })
  }

  // 3. iter549 invariant: sprint-edit aria-required 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const ariaReqCount = (sp.match(/aria-required="true"/g) ?? []).length
  if (ariaReqCount >= 5) {
    findings.push({
      level: 'info',
      message: `iter549 invariant: sprint-edit aria-required 5 件以上維持 OK (${ariaReqCount})`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter549 invariant: 破壊 (${ariaReqCount} 件)`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (schedule-interrupt-add-aria-iter550) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
