/**
 * Phase 6.15 loop iter 902 (mode-D Desktop a11y) —
 * item-edit-dialog edit-item-kr <select> aria-label を WCAG 2.5.3 (Label in Name)
 * 適合形に変更。visible <Label>"Key Result (OKR)" の "(OKR)" が aria-label に含まれず
 * substring 不適合だった。
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx の edit-item-kr <select> は
 *   <Label htmlFor="editKr">Key Result (OKR)</Label> で visible label "Key Result (OKR)"
 *   を持つが、3 状態 aria-label すべてが "(OKR)" を含まず substring 不適合 → WCAG 2.5.3 違反:
 *   - pending: "Key Result 割当を更新中…"
 *   - assigned: "Key Result「{title}」(Goal「{goalTitle}」) に割当中 (...)"
 *   - unassigned: "Key Result 未割当 (...)"
 *
 * fix (1 ファイル / +3-3 行差分、3 case 一括):
 *   - aria-label すべてに "(OKR)" を Key Result の直後に挿入
 *     - pending: `Key Result (OKR) 割当を更新中…`
 *     - assigned: `Key Result (OKR)「${title}」(Goal「${goalTitle}」) に割当中 (...)`
 *     - unassigned: `Key Result (OKR) 未割当 (...)`
 *
 * 検証: source-side regex assert + iter900/901 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. pending aria-label に "Key Result (OKR)" prefix
  if (/'Key Result \(OKR\) 割当を更新中…'/.test(ied)) {
    findings.push({
      level: 'info',
      message: `edit-item-kr pending aria-label に "Key Result (OKR)" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `edit-item-kr pending aria-label が "Key Result (OKR)" prefix 不含`,
    })
  }

  // 2. assigned aria-label に "Key Result (OKR)" prefix
  if (
    /`Key Result \(OKR\)「\$\{current\.title\}」\(Goal「\$\{current\.goalTitle\}」\) に割当中 \(変更で別 KR へ移動\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `edit-item-kr assigned aria-label に "Key Result (OKR)" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `edit-item-kr assigned aria-label が "Key Result (OKR)" prefix 不含`,
    })
  }

  // 3. unassigned aria-label に "Key Result (OKR)" prefix
  if (/'Key Result \(OKR\) 未割当 \(選択で稼働中 Goal の KR に割当\)'/.test(ied)) {
    findings.push({
      level: 'info',
      message: `edit-item-kr unassigned aria-label に "Key Result (OKR)" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `edit-item-kr unassigned aria-label が "Key Result (OKR)" prefix 不含`,
    })
  }

  // 4. 旧 "Key Result 割当を更新中…" 削除
  if (!/'Key Result 割当を更新中…'/.test(ied)) {
    findings.push({
      level: 'info',
      message: `edit-item-kr 旧 pending aria-label 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `edit-item-kr 旧 pending aria-label 残存` })
  }

  // iter901 invariant: gantt-zoom-select aria-label "zoom" prefix
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/aria-label=\{`zoom: Gantt の 1 日あたりの幅 \(現在: \$\{/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter901 invariant: gantt-zoom-select aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter901 invariant: gantt-zoom-select 破壊` })
  }

  console.log(`\n=== Findings (edit-item-kr-label-in-name-iter902) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
