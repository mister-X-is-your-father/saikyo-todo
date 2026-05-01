/**
 * Phase 6.15 loop iter 545 (mode-D Desktop a11y) —
 * ScheduleItemPicker cancel Button に aria-label + data-testid を補完。
 *
 * 課題: schedule-item-picker.tsx 行 114-118 の cancel Button は visible text
 *   "キャンセル" のみで aria-label / data-testid 不在。SR は「キャンセル ボタン」
 *   だけで context が伝わらない。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label="task pick をキャンセル"
 *   - data-testid="schedule-picker-cancel"
 *
 * iter543 (wf-editor-cancel) / iter544 (item-edit-cancel) と同 pattern を
 * ScheduleItemPicker footer に展開、3 dialog footer 統一達成。
 *
 * 検証: source-side regex assert + iter515-544 invariant cross-check。
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

  // 1. schedule-picker-cancel aria-label + data-testid
  if (
    /data-testid="schedule-picker-cancel"\s+aria-label="task pick をキャンセル"/.test(sip) ||
    /aria-label="task pick をキャンセル"\s+data-testid="schedule-picker-cancel"/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker.tsx: schedule-picker-cancel aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker.tsx: cancel Button aria-label / data-testid 不在`,
    })
  }

  // 2. iter544 invariant: item-edit-cancel aria-label 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/aria-label=\{`「\$\{item\.title\}」の編集をキャンセル`\}/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter544 invariant: item-edit-cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter544 invariant: 破壊`,
    })
  }

  // 3. iter543 invariant: wf-editor-cancel aria-label 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Workflow「\$\{wf\.name\}」の編集をキャンセル`\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter543 invariant: wf-editor-cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter543 invariant: 破壊`,
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

  console.log(`\n=== Findings (schedule-cancel-aria-iter545) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
