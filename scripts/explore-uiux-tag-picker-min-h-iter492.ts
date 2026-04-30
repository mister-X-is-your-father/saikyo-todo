/**
 * Phase 6.15 loop iter 492 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * TagPicker trigger Button を h-8 → min-h-11 化、codify (iter491 続編)。
 *
 * 課題: src/components/workspace/tag-picker.tsx 行 84 の Button trigger が
 *   `className="h-8 justify-start gap-2"` で h-8 (32px) 固定、mobile WCAG 2.5.5 AAA 違反。
 *   iter491 で AssigneePicker は同 fix 適用済、本 iter で TagPicker も水平展開し
 *   ItemEditDialog の 2 picker (担当者 / タグ) が完全統一。
 *
 * fix (1 ファイル 1 行修正):
 *   - `className="h-8 justify-start gap-2"` → `className="min-h-11 justify-start gap-2"`
 *
 * 累計 **113 button mobile target 達成** (iter460-492 で 27 fix iter)。
 *
 * 検証: source-side regex assert + AssigneePicker (iter491) との pattern 整合性 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/tag-picker.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. trigger Button に min-h-11 配線
  if (
    /<Button[\s\S]{0,200}?size="sm"[\s\S]{0,200}?data-testid="tag-picker-trigger"[\s\S]{0,200}?className="min-h-11 justify-start gap-2"/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: trigger Button min-h-11 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: trigger Button min-h-11 配線 不在` })
  }

  // 2. 旧 h-8 が消えている
  if (!/className="h-8 justify-start gap-2"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: 旧 h-8 className が消えている OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 h-8 className が残存` })
  }

  // 3. aria-label / aria-expanded / aria-haspopup="listbox" 維持
  if (
    /aria-label=\{[\s\S]{0,300}?タグを選択/.test(src) &&
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

  // 4. Popover + Command structure 維持
  if (
    /<Popover open=\{open\} onOpenChange=\{setOpen\}>/.test(src) &&
    /<PopoverContent className="w-72 p-0"/.test(src) &&
    /<Command>/.test(src) &&
    /<CommandInput placeholder="タグを検索 or 作成…"/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: Popover + Command structure 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Popover + Command structure 破壊` })
  }

  // 5. iter491 invariant: AssigneePicker (兄弟) も min-h-11 化済 (= 2 picker pattern 統一)
  const assigneeSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (
    /<Button[\s\S]{0,200}?size="sm"[\s\S]{0,200}?data-testid="assignee-picker-trigger"[\s\S]{0,200}?className="min-h-11 justify-start gap-2"/.test(
      assigneeSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `src/components/workspace/assignee-picker.tsx: iter491 invariant (min-h-11) 維持 OK (= TagPicker と整合)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src/components/workspace/assignee-picker.tsx: iter491 invariant 破壊`,
    })
  }

  console.log(`\n=== Findings (tag-picker-min-h-iter492) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
