/**
 * Phase 6.15 loop iter 870 (mode-D Desktop a11y) —
 * schedule-item-picker 内 3 visible (item title button / 割込み追加 / キャンセル) を
 * aria-hidden span で wrap.
 *
 * 課題: src/components/schedule/schedule-item-picker.tsx の 3 visible spot:
 *   - item pick button 内 {it.title} (行 86): aria-label "item「{title}」を選択 (MUST)"
 *   - 割込み追加 button "割込みとして追加" (行 122): aria-label "割込み / 休憩として追加 (メモ: ...)"
 *   - キャンセル button "キャンセル" (行 136): aria-label "task pick をキャンセル"
 * 各々 aria-label が完全 content を含むのに、内側 visible は aria-hidden 無し → SR ユーザに重複読み上げ。
 * iter844-869 sweep の続編で 3 callsite 一括対応、Schedule task picker の SR 経路整合性向上。
 *
 * fix (1 ファイル ~3 行差分):
 *   - 各 visible label を <span aria-hidden="true"> で wrap
 *   - MustBadge / Input / data-testid 維持
 *
 * 検証: source-side regex assert + iter735-869 invariant cross-check。
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

  // 1. item pick button 内 title aria-hidden span
  if (/<span className="truncate" aria-hidden="true">\n\s+\{it\.title\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `schedule-picker item title visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-picker item title visible aria-hidden 未統合`,
    })
  }

  // 2. 割込みとして追加 button visible
  if (/<span aria-hidden="true">割込みとして追加<\/span>/.test(sp)) {
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

  // 3. キャンセル button visible
  if (/<span aria-hidden="true">キャンセル<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `schedule-picker-cancel visible "キャンセル" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-picker-cancel visible aria-hidden 未統合`,
    })
  }

  // 4. 3 button aria-label 維持
  const ariaLabels = [
    /aria-label=\{`item「\$\{it\.title\}」を選択\$\{it\.isMust \? ' \(MUST\)' : ''\}`\}/.test(sp),
    /aria-label=\{`割込み \/ 休憩として追加\$\{interruptNote \? ` \(メモ: \$\{interruptNote\}\)` : ''\}`\}/.test(
      sp,
    ),
    /aria-label="task pick をキャンセル"/.test(sp),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `schedule-picker 3 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-picker aria-label regression (${ariaLabels.filter(Boolean).length}/3)`,
    })
  }

  // 5. iter869 invariant: integrations-panel 5 visible aria-hidden
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(ip) &&
    /<span aria-hidden="true">履歴<\/span>/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `iter869 invariant: integrations-panel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter869 invariant: 破壊` })
  }

  // 6. iter735 invariant
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

  console.log(`\n=== Findings (schedule-picker-aria-hidden-iter870) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
