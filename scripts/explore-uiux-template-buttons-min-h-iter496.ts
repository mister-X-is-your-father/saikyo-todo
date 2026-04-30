/**
 * Phase 6.15 loop iter 496 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * Templates 系列 4 button (instantiate / add / 2 trash) を 44x44 化、codify。
 *
 * 課題: Template 関連 4 button が `size="sm"` (h-8 = 32px) で `className="min-h-11"` 漏れ。
 *   Template 機能は MVP 後の重要機能 (繰り返し作業の即実行) で frequent tap target。
 *
 *   - instantiate-form.tsx 行 122-134: 「即実行」 submit button (Template を workspace に展開する trigger)
 *   - template-items-editor.tsx 行 135-149: 「+ 追加」 submit button (Template に子 Item 追加)
 *   - template-items-editor.tsx 行 179-192: Trash2 削除 icon button (Template item 削除)
 *   - templates-panel.tsx 行 252-265: Trash2 削除 icon button (Template そのもの削除)
 *
 *   icon button (Trash2) は min-h-11 + min-w-11 で 44x44 squarized、submit button は
 *   min-h-11 のみ (visual width は content による)。
 *
 * fix (3 ファイル ~4 行追加):
 *   - 「即実行」: `<Button type="submit" size="sm" className="min-h-11" ...>`
 *   - 「+ 追加」: 同上
 *   - 2 Trash2: `<Button variant="ghost" size="sm" className="min-h-11 min-w-11" ...>`
 *
 * 累計 **128 button mobile target 達成** (iter460-496 で 30 fix iter、+4 件)。
 * 機能不変、aria-label / aria-busy / shadcn Trash2 icon すべて維持。
 *
 * 検証: source-side regex assert 4 file 4 button。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. instantiate-form.tsx 即実行 button
  const instPath = 'src/components/template/instantiate-form.tsx'
  const instSrc = readFileSync(resolve(process.cwd(), instPath), 'utf8')
  if (
    /<Button\s+type="submit"\s+size="sm"\s+className="min-h-11"\s+disabled=\{mut\.isPending\}/.test(
      instSrc,
    )
  ) {
    findings.push({ level: 'info', message: `${instPath}: 即実行 Button min-h-11 OK` })
  } else {
    findings.push({ level: 'warning', message: `${instPath}: 即実行 Button min-h-11 不在` })
  }

  // 2. template-items-editor.tsx + 追加 button
  const tiePath = 'src/components/template/template-items-editor.tsx'
  const tieSrc = readFileSync(resolve(process.cwd(), tiePath), 'utf8')
  if (
    /<Button\s+type="submit"\s+size="sm"\s+className="min-h-11"\s+disabled=\{addMut\.isPending/.test(
      tieSrc,
    )
  ) {
    findings.push({ level: 'info', message: `${tiePath}: + 追加 Button min-h-11 OK` })
  } else {
    findings.push({ level: 'warning', message: `${tiePath}: + 追加 Button min-h-11 不在` })
  }

  // 3. template-items-editor.tsx Trash2 button
  if (
    /<Button[\s\S]{0,200}?variant="ghost"[\s\S]{0,200}?size="sm"[\s\S]{0,200}?className="min-h-11 min-w-11"[\s\S]{0,200}?onClick=\{\(\) => handleRemove/.test(
      tieSrc,
    )
  ) {
    findings.push({ level: 'info', message: `${tiePath}: Trash2 Button min-h-11 + min-w-11 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${tiePath}: Trash2 Button min-h-11 + min-w-11 不在`,
    })
  }

  // 4. templates-panel.tsx Trash2 button
  const tpPath = 'src/components/template/templates-panel.tsx'
  const tpSrc = readFileSync(resolve(process.cwd(), tpPath), 'utf8')
  if (
    /<Button[\s\S]{0,200}?variant="ghost"[\s\S]{0,200}?size="sm"[\s\S]{0,200}?className="min-h-11 min-w-11"[\s\S]{0,200}?onClick=\{\(\) => handleDelete/.test(
      tpSrc,
    )
  ) {
    findings.push({ level: 'info', message: `${tpPath}: Trash2 Button min-h-11 + min-w-11 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${tpPath}: Trash2 Button min-h-11 + min-w-11 不在`,
    })
  }

  // 5. aria-label 維持 (regression)
  if (/aria-label=\{[\s\S]{0,300}?Template「\$\{template\.name\}」を即実行/.test(instSrc)) {
    findings.push({ level: 'info', message: `${instPath}: aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${instPath}: aria-label 破壊` })
  }
  if (/aria-label=\{[\s\S]{0,300}?子 Item を Template に追加/.test(tieSrc)) {
    findings.push({ level: 'info', message: `${tiePath}: + 追加 aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${tiePath}: + 追加 aria-label 破壊` })
  }
  if (/aria-label=\{[\s\S]{0,300}?Template item「\$\{it\.title\}」を削除/.test(tieSrc)) {
    findings.push({ level: 'info', message: `${tiePath}: Trash2 aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${tiePath}: Trash2 aria-label 破壊` })
  }

  console.log(`\n=== Findings (template-buttons-min-h-iter496) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
