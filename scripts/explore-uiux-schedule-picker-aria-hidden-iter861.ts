/**
 * Phase 6.15 loop iter 861 (mode-D Desktop a11y) —
 * schedule-item-picker 割込みとして追加 + キャンセル button:
 * WCAG 2.5.3 (Label in Name) 違反を修正 + iter844-860 pattern 統一。
 *
 * 課題:
 *  1. 割込みとして追加 button (schedule-picker-interrupt-add): visible
 *     "割込みとして追加" は aria-label "割込み / 休憩として追加" の助詞 " / 休憩"
 *     を挟んで連続せず strict substring に **ならない** (= name に visible
 *     含まれず WCAG 2.5.3 失敗、voice control「割込みとして追加」発話で
 *     name 一致せず)。
 *  2. キャンセル button (schedule-picker-cancel): visible "キャンセル" は
 *     aria-label "task pick をキャンセル" の strict substring 満たすが
 *     iter844-860 pattern 統一。
 *
 * fix (1 ファイル ~2 行差分):
 *   - 両 button visible を <span aria-hidden="true"> で wrap、aria-label
 *     単独経路に統一 (iter844-860 同 pattern)。
 *   - aria-label の「/ 休憩」 + メモ optional 文脈、 task pick キャンセル
 *     文脈は維持。
 *
 * 検証: source-side regex assert + iter735-860 invariant cross-check。
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

  // 1. interrupt-add visible aria-hidden
  if (/<span aria-hidden="true">割込みとして追加<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `schedule-picker-interrupt-add visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-picker-interrupt-add visible aria-hidden 未統合`,
    })
  }

  // 2. cancel visible aria-hidden
  if (/<span aria-hidden="true">キャンセル<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `schedule-picker-cancel visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-picker-cancel visible aria-hidden 未統合`,
    })
  }

  // 3. interrupt-add aria-label に「/ 休憩」 + メモ optional 文脈維持
  if (
    /aria-label=\{`割込み \/ 休憩として追加\$\{interruptNote \? ` \(メモ: \$\{interruptNote\}\)` : ''\}`\}/.test(
      sip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `schedule-picker-interrupt-add aria-label (休憩 + メモ) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-picker-interrupt-add aria-label 文脈破壊`,
    })
  }

  // 4. cancel aria-label 維持
  if (/aria-label="task pick をキャンセル"/.test(sip)) {
    findings.push({
      level: 'info',
      message: `schedule-picker-cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `schedule-picker-cancel aria-label 破壊` })
  }

  // iter860 invariant: today-view quick-add empty CTA aria-hidden
  const tv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/today-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: today-view quick-add aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant 破壊` })
  }

  // iter859 invariant: templates 作成フォームへ aria-hidden
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: templates 作成フォームへ aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (schedule-picker-aria-hidden-iter861) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
