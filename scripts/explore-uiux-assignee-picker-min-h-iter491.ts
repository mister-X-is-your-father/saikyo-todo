/**
 * Phase 6.15 loop iter 491 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * AssigneePicker trigger Button を h-8 → min-h-11 化、codify。
 *
 * 課題: src/components/workspace/assignee-picker.tsx 行 91 の Button trigger が
 *   `className="h-8 justify-start gap-2"` で h-8 (32px) 固定。size="sm" + h-8 という
 *   shadcn Button の typical な「コンパクト trigger」 pattern だが、mobile WCAG 2.5.5 AAA
 *   44x44 違反。assignee selector はメンバー / AI agent を切替える ItemEditDialog の中核
 *   action なので tap target 不揃いは UX 的にも痛い。
 *
 *   兄弟 picker (TagPicker) も同じ h-8 pattern (= 別 iter で sweep 候補)。
 *
 * fix (1 ファイル 1 行修正):
 *   - `className="h-8 justify-start gap-2"` → `className="min-h-11 justify-start gap-2"`
 *   - h-8 (固定 32px) → min-h-11 (最低 44px、content 多ければ拡張)
 *   - 機能不変、aria-label / aria-expanded / aria-haspopup="listbox" 維持
 *
 * 累計 **112 button mobile target 達成** (iter460-491 で 26 fix iter)。
 *
 * 検証: source-side regex assert + Popover / Command / 旧 h-8 消滅 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/assignee-picker.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. trigger Button に min-h-11 配線
  if (
    /<Button[\s\S]{0,200}?size="sm"[\s\S]{0,200}?data-testid="assignee-picker-trigger"[\s\S]{0,200}?className="min-h-11 justify-start gap-2"/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: trigger Button min-h-11 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: trigger Button min-h-11 配線 不在`,
    })
  }

  // 2. 旧 h-8 が消えている (置換済)
  if (!/className="h-8 justify-start gap-2"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: 旧 h-8 className が消えている OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 h-8 className が残存` })
  }

  // 3. aria-label / aria-expanded / aria-haspopup="listbox" 維持 (regression)
  if (
    /aria-label=\{[\s\S]{0,300}?アサインを選択/.test(src) &&
    /aria-expanded=\{open\}/.test(src) &&
    /aria-haspopup="listbox"/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: aria-label / aria-expanded / aria-haspopup 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: aria-label / aria-expanded / aria-haspopup 破壊`,
    })
  }

  // 4. Popover + Command structure 維持 (regression)
  if (
    /<Popover open=\{open\} onOpenChange=\{setOpen\}>/.test(src) &&
    /<PopoverContent className="w-64 p-0"/.test(src) &&
    /<Command>/.test(src) &&
    /<CommandInput placeholder="メンバー \/ AI を検索…"/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: Popover + Command structure 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: Popover + Command structure 破壊` })
  }

  // 5. 兄弟 picker (TagPicker) は別 iter sweep 待ち (h-8 残存を期待値として認識、
  //    本 iter 487 の関心外、本 cross-check はメモのみ)
  const tagPickerSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'),
    'utf8',
  )
  if (/className="h-8 justify-start gap-2"/.test(tagPickerSrc)) {
    findings.push({
      level: 'info',
      message: `src/components/workspace/tag-picker.tsx: 同 h-8 pattern (次 iter で sweep 候補)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `src/components/workspace/tag-picker.tsx: 既に min-h-11 化済 (= AssigneePicker と整合)`,
    })
  }

  console.log(`\n=== Findings (assignee-picker-min-h-iter491) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
