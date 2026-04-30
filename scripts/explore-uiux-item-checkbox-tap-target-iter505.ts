/**
 * Phase 6.15 loop iter 505 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * ItemCheckbox の tap target を pseudo で 44x44 に拡張 (visual h-5 w-5 維持)、codify。
 *
 * 課題: src/components/workspace/item-checkbox.tsx 行 52-79 の `<button role="checkbox">`:
 *   - `h-5 w-5` (20x20px) で WCAG 2.5.5 AAA 44x44 違反
 *   - 視覚的な checkbox サイズ (20x20) は他要素 (priority dot 等) と sized で見栄えバランス上
 *     重要 → min-h-11 min-w-11 で button 自体を 44x44 化すると row layout が崩れる
 *
 *   標準 a11y 技法: `::before` pseudo で透明な extension を visible 周囲に出して tap target を
 *   拡張 (Tailwind: `relative` + `before:absolute before:-inset-3 before:rounded-full
 *   before:content-['']`)。disabled 時は `disabled:before:hidden` で mouseover/click anchor を消す。
 *
 *   ItemCheckbox は Today / Inbox / Kanban / Backlog の各 item row で頻繁に tap される
 *   コア control。mobile 20x20 tap で誤タップ多発。
 *
 * fix (1 ファイル ~5 行差分):
 *   - className に `relative` + `before:absolute before:-inset-3 before:rounded-full
 *     before:content-['']` + `disabled:before:hidden` 追加
 *   - h-5 w-5 / colorClass / 既存 transition 維持
 *   - 視覚 layout 不変 (visible は依然 20x20)、tap target は visible 周囲 12px を拡張して合計 44x44
 *
 * 機能不変、shadcn 編集なし、aria-checked / aria-label / data-testid は維持。
 *
 * 検証: source-side regex assert + iter504 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/item-checkbox.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. tap target 拡張 className 配線
  if (
    /relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors before:absolute before:-inset-3 before:rounded-full before:content-\[''\] disabled:before:hidden/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: tap target 拡張 className (relative + before:-inset-3 + disabled:before:hidden) 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: tap target 拡張 className 配線 不在`,
    })
  }

  // 2. h-5 w-5 visible size 維持 (regression — 視覚 checkbox は 20x20 のまま)
  if (/h-5 w-5/.test(src)) {
    findings.push({ level: 'info', message: `${path}: h-5 w-5 visible size 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: h-5 w-5 visible size 破壊` })
  }

  // 3. role="checkbox" + aria-checked + aria-label 維持
  if (
    /role="checkbox"/.test(src) &&
    /aria-checked=\{isDone\}/.test(src) &&
    /aria-label=\{`「\$\{item\.title\}」を\$\{isDone \? '未完了に戻す' : '完了にする'\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: role=checkbox + aria-checked + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: role=checkbox + aria-checked + aria-label 破壊`,
    })
  }

  // 4. PRIORITY_CLASS map 維持 (regression)
  if (/'border-red-500 hover:bg-red-50 data-\[checked=true\]:bg-red-500'/.test(src)) {
    findings.push({ level: 'info', message: `${path}: PRIORITY_CLASS map 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: PRIORITY_CLASS map 破壊` })
  }

  // 5. iter504 invariant: ItemEditDialog dodRef + dueDateRef 維持
  const itemEditSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /const dodRef = useRef<HTMLInputElement>\(null\)/.test(itemEditSrc) &&
    /const dueDateRef = useRef<HTMLInputElement>\(null\)/.test(itemEditSrc)
  ) {
    findings.push({
      level: 'info',
      message: `src/components/workspace/item-edit-dialog.tsx: iter504 invariant (dodRef + dueDateRef) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src/components/workspace/item-edit-dialog.tsx: iter504 invariant 破壊`,
    })
  }

  console.log(`\n=== Findings (item-checkbox-tap-target-iter505) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
