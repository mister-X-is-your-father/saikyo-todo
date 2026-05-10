/**
 * Phase 6.15 loop iter 881 (mode-D Desktop a11y) —
 * mock-submit-form 工数送信 button: Unicode ellipsis 統一 (visible '...' → '…') +
 * aria-label を visible prefix 適合形に変更 + visible aria-hidden 統合。
 *
 * 課題: src/components/mock-timesheet/mock-submit-form.tsx の tsSubmit button:
 *   - visible '送信中...' (3 dots ASCII) は aria-label '送信中… (mock-timesheet ...)' の
 *     '…' (Unicode 1 char) と最後の char が異なり substring 不適合 → WCAG 2.5.3 違反
 *   - visible '送信' は aria-label '工数を送信 (...)' に '送信' 含むため適合だったが
 *     iter844-880 campaign 規約から外れていた (wrap 漏れ)
 *
 * fix (1 ファイル / +3-2 行差分):
 *   - visible '送信中...' → '送信中…' (Unicode ellipsis 統一、aria-label と一致)
 *   - aria-label normal を `送信 (mock-timesheet 入力フォームから工数を送信)` に変更し visible '送信' prefix 適合
 *   - visible 全体を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter879/880 invariant cross-check (Unicode ellipsis
 * pattern は iter879 create-time-entry-submit と同 root cause)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ms = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )

  // 1. visible '送信中…' (Unicode) / '送信' span aria-hidden + 旧 '...' 削除
  if (/<span aria-hidden="true">\{isPending \? '送信中…' : '送信'\}<\/span>/.test(ms)) {
    findings.push({
      level: 'info',
      message: `mock-submit visible '送信中…/送信' span aria-hidden + Unicode 統一 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit visible aria-hidden 未統合 or Unicode 未統一`,
    })
  }
  if (!/'送信中\.\.\.' : '送信'/.test(ms)) {
    findings.push({
      level: 'info',
      message: `mock-submit 旧 visible '送信中...' (3 dots) 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit 旧 visible '送信中...' 残存`,
    })
  }

  // 2. aria-label normal に visible '送信' prefix
  if (/'送信 \(mock-timesheet 入力フォームから工数を送信\)'/.test(ms)) {
    findings.push({
      level: 'info',
      message: `mock-submit normal aria-label に visible '送信' prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit normal aria-label に '送信' prefix 不含`,
    })
  }

  // 3. 旧 normal aria-label '工数を送信 (mock-timesheet 入力フォーム)' 削除
  if (!/'工数を送信 \(mock-timesheet 入力フォーム\)'/.test(ms)) {
    findings.push({
      level: 'info',
      message: `mock-submit 旧 normal aria-label 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit 旧 normal aria-label 残存`,
    })
  }

  // iter880 invariant: schedule-picker interrupt-add aria-label
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (/aria-label=\{`割込みとして追加 \(休憩 \/ 割込み記録、task に紐付けない\)\$\{/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter880 invariant: schedule-picker interrupt-add aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter880 invariant: schedule-picker 破壊` })
  }

  // iter879 invariant: create-time-entry-submit (同 Unicode ellipsis pattern)
  const cf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '記録中…' : '記録'\}<\/span>/.test(cf)) {
    findings.push({
      level: 'info',
      message: `iter879 invariant: create-time-entry-submit 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter879 invariant: create-time-entry-submit 破壊` })
  }

  console.log(`\n=== Findings (mock-submit-form-aria-hidden-iter881) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
