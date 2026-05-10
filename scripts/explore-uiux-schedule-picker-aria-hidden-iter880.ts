/**
 * Phase 6.15 loop iter 880 (mode-D Desktop a11y) —
 * schedule-item-picker の 2 button: schedule-picker-interrupt-add は WCAG 2.5.3
 * (Label in Name) 違反修正 + visible aria-hidden、schedule-picker-cancel は visible
 * aria-hidden。
 *
 * 課題: src/components/schedule/schedule-item-picker.tsx:
 *   - schedule-picker-interrupt-add (visible "割込みとして追加") 旧 aria-label "割込み /
 *     休憩として追加" は ` / 休憩` が visible token "割込みとして追加" の間に挿入されて
 *     substring 不適合 → 音声「割込みとして追加」が hit せず WCAG 2.5.3 違反。
 *   - schedule-picker-cancel (visible "キャンセル") aria-label "task pick をキャンセル" 適合だったが
 *     iter844-879 campaign 規約から外れていた。
 *
 * fix (1 ファイル / +5-3 行差分、2 button):
 *   - interrupt-add aria-label を `割込みとして追加 (休憩 / 割込み記録、task に紐付けない)` 形に変更し
 *     visible prefix 適合化、span aria-hidden で wrap
 *   - cancel: visible "キャンセル" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter877-879 invariant cross-check。
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
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )

  // 1. interrupt-add 新 aria-label に visible "割込みとして追加" prefix
  if (/aria-label=\{`割込みとして追加 \(休憩 \/ 割込み記録、task に紐付けない\)\$\{/.test(sp)) {
    findings.push({
      level: 'info',
      message: `interrupt-add aria-label に visible "割込みとして追加" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `interrupt-add aria-label に visible "割込みとして追加" prefix 不含`,
    })
  }

  // 2. interrupt-add visible "割込みとして追加" span aria-hidden
  if (/<span aria-hidden="true">割込みとして追加<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `interrupt-add visible span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `interrupt-add visible aria-hidden 未統合`,
    })
  }

  // 3. 旧 aria-label "割込み / 休憩として追加" 削除
  if (!/aria-label=\{`割込み \/ 休憩として追加\$\{/.test(sp)) {
    findings.push({
      level: 'info',
      message: `interrupt-add 旧 aria-label "割込み / 休憩として追加" 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `interrupt-add 旧 aria-label 残存`,
    })
  }

  // 4. schedule-picker-cancel visible "キャンセル" span aria-hidden
  if (
    /data-testid="schedule-picker-cancel"[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `schedule-picker-cancel visible "キャンセル" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-picker-cancel visible "キャンセル" aria-hidden 未統合`,
    })
  }

  // iter879 invariant: time-entry-sync visible aria-hidden
  const tt = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}<\/span>/.test(tt)
  ) {
    findings.push({
      level: 'info',
      message: `iter879 invariant: time-entry-sync aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter879 invariant: time-entry-sync 破壊` })
  }

  // iter878 invariant: wf-node-preset
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\+ \{preset\.type\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter878 invariant: wf-node-preset aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter878 invariant: wf-node-preset 破壊` })
  }

  console.log(`\n=== Findings (schedule-picker-aria-hidden-iter880) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
