/**
 * Phase 6.15 loop iter 513 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * 4 ファイルの 7 default-size Button (= h-9 36px) を 44x44 化、codify。
 *
 * 課題: shadcn Button 既定 size は h-9 (36px) で WCAG 2.5.5 AAA 違反。size="sm" sweep が
 *   iter460-512 で完了したが、size 属性 omit (= 既定 h-9) の Button は別カテゴリで残存。
 *   Python audit で 7 件発見:
 *     - item-edit-dialog.tsx 行 863, 866: footer cancel + save (item 編集の最重要 button)
 *     - integrations-panel.tsx 行 461: source 作成 form submit
 *     - schedule-item-picker.tsx 行 103, 114: 割込み追加 + キャンセル
 *     - workflows-panel.tsx 行 141, 608, 611: workflow 作成 + dialog cancel + save
 *
 * fix (4 ファイル ~7 行追加):
 *   - 各 Button に `className="min-h-11"` 挿入
 *   - 一部 cancel button は variant="ghost"/"outline" で multi-line 整形
 *
 * 累計 **143 button mobile target 達成** (iter460-513 で 54 fix iter、+7 件)。
 * 機能不変、shadcn 編集なし、aria-label / data-testid / disabled state すべて維持。
 *
 * 検証: source-side regex assert で 4 file 7 button 全件確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. item-edit-dialog.tsx footer cancel + save
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<Button\s+type="button"\s+variant="outline"\s+className="min-h-11"\s+onClick=\{\(\) => onOpenChange\(false\)\}/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: footer cancel Button min-h-11 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-dialog.tsx: footer cancel 不在` })
  }
  if (/<Button\s+type="button"\s+className="min-h-11"\s+onClick=\{handleSave\}/.test(ied)) {
    findings.push({ level: 'info', message: `item-edit-dialog.tsx: save Button min-h-11 OK` })
  } else {
    findings.push({ level: 'warning', message: `item-edit-dialog.tsx: save Button 不在` })
  }

  // 2. integrations-panel.tsx source 作成 form submit
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /<Button\s+type="submit"\s+className="min-h-11"\s+disabled=\{!name\.trim\(\) \|\| create\.isPending\}/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `integrations-panel.tsx: source 作成 submit min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel.tsx: source 作成 submit 不在`,
    })
  }

  // 3. schedule-item-picker.tsx 割込み追加 + キャンセル
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (
    /<Button\s+type="button"\s+variant="secondary"\s+className="min-h-11"\s+onClick=\{\(\) => onPick/.test(
      sip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker.tsx: 割込み追加 Button min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker.tsx: 割込み追加 Button 不在`,
    })
  }
  if (
    /<Button\s+type="button"\s+variant="ghost"\s+className="min-h-11"\s+onClick=\{onCancel\}/.test(
      sip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker.tsx: キャンセル Button min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker.tsx: キャンセル Button 不在`,
    })
  }

  // 4. workflows-panel.tsx workflow 作成 + dialog cancel + save
  const wfp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<Button\s+type="submit"\s+className="min-h-11"\s+disabled=\{!name\.trim\(\) \|\| create\.isPending\}[\s\S]{0,500}?data-testid="wf-create-btn"/.test(
      wfp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: workflow 作成 submit min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: workflow 作成 submit 不在`,
    })
  }
  // dialog cancel + save (DialogFooter 内)
  if (
    /<Button\s+type="button"\s+variant="ghost"\s+className="min-h-11"\s+onClick=\{\(\) => onOpenChange\(false\)\}/.test(
      wfp,
    ) &&
    /<Button\s+type="button"\s+className="min-h-11"\s+disabled=\{saving\}/.test(wfp)
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: dialog cancel + save Button min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: dialog cancel + save Button 不在`,
    })
  }

  console.log(`\n=== Findings (default-size-buttons-min-h-iter513) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
