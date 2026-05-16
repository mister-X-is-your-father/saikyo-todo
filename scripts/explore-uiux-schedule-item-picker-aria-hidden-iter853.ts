/**
 * Phase 6.15 loop iter 853 (mode-D Desktop a11y) —
 * schedule-item-picker の 3 種 visible text を <span aria-hidden="true"> で wrap し、
 * aria-label 単独経路に統一。
 *
 * 経緯: iter852 で picker 系 option を統一済 → schedule-item-picker (実績 / 想定
 *   タスク pick 用 modal dialog) も同 pattern で sweep。3 種 visible text:
 *     1. li 内 task button visible {it.title} (aria-label "item「{title}」を選択 [MUST]")
 *     2. 割込み追加 button visible "割込みとして追加" (aria-label 完全 content)
 *     3. キャンセル button visible "キャンセル" (aria-label "task pick をキャンセル")
 *
 * 修正: 3 箇所一括で visible text を span aria-hidden で wrap、aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849/850/851/852 invariant cross-check。
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

  // 1. li 内 task button visible {it.title} を aria-hidden span で wrap
  if (/<span className="truncate" aria-hidden="true">\s*\{it\.title\}\s*<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker task option visible {it.title} aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker task option {it.title} aria-hidden 未統合`,
    })
  }

  // 2. task button aria-label 完全 content 維持 (MUST 込み)
  if (
    /aria-label=\{`item「\$\{it\.title\}」を選択\$\{it\.isMust \? ' \(MUST\)' : ''\}`\}/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker task option aria-label 完全 content (MUST 込み) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker task option aria-label 破壊`,
    })
  }

  // 3. 割込み追加 button visible aria-hidden
  if (/<span aria-hidden="true">割込みとして追加<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker interrupt button visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker interrupt button visible aria-hidden 未統合`,
    })
  }

  // 4. 割込み追加 button aria-label 完全 content 維持
  if (
    /aria-label=\{`割込み \/ 休憩として追加\$\{interruptNote \? ` \(メモ: \$\{interruptNote\}\)` : ''\}`\}/.test(
      sip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker interrupt button aria-label 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker interrupt button aria-label 破壊`,
    })
  }

  // 5. キャンセル button visible aria-hidden
  if (/<span aria-hidden="true">キャンセル<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker cancel button visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker cancel button visible aria-hidden 未統合`,
    })
  }

  // 6. キャンセル button aria-label 維持
  if (/aria-label="task pick をキャンセル"/.test(sip)) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker cancel button aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker cancel button aria-label 破壊`,
    })
  }

  // 7. data-testid + role=dialog + aria-modal 維持
  if (
    /role="dialog"/.test(sip) &&
    /aria-modal="true"/.test(sip) &&
    /aria-labelledby="schedule-picker-title"/.test(sip) &&
    /data-testid="schedule-picker-cancel"/.test(sip) &&
    /data-testid="schedule-picker-interrupt-add"/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker dialog semantic + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker dialog semantic / data-testid 破壊`,
    })
  }

  // iter852 invariant: assignee/tag picker option visible {label}/{t.name} aria-hidden
  const assignee = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  const tag = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'),
    'utf8',
  )
  if (
    (assignee.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []).length >= 2 &&
    /<span aria-hidden="true">\{t\.name\}<\/span>/.test(tag)
  ) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: assignee/tag picker option aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
  }

  // iter851 invariant
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab) &&
    /<span aria-hidden="true">解除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-action-bar aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (schedule-item-picker-aria-hidden-iter853) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
