/**
 * Phase 6.15 loop iter 429 (mode-D Desktop a11y) — Inbox view の row が
 * `<div onClick>` で keyboard a11y 不在 + button-in-button 違反だった問題を
 * 修正、codify。
 *
 * 課題: src/components/workspace/inbox-view.tsx の row:
 *   ```tsx
 *   <div onClick={...} className="cursor-pointer ...">
 *     <ItemCheckbox />
 *     <span aria-label="..." />  // priority dot
 *     <button onClick={(e) => { e.stopPropagation(); ...}}>  // title button
 *       {it.title}
 *     </button>
 *   </div>
 *   ```
 *   問題:
 *   1. outer `<div onClick>` は role/tabIndex/onKeyDown 不在 → keyboard ユーザは
 *      Tab で row 全体に focus できず、Enter/Space で開けない (clickable mouse-only)
 *   2. inner `<button>` の `e.stopPropagation()` は outer click を止めるためだが、
 *      重複した interactive element (両方 setOpenItemId 同じ id を呼ぶ) で
 *      SR ユーザに混乱
 *   3. outer div を role="button" にすると button-in-button (WAI-ARIA: 非
 *      interactive 化された要素を除き focusable child を持てない) になる
 *
 * fix: 1 ファイル ~12 行差分。
 *   - outer `<div>` に `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space)
 *     + `aria-label` + focus-visible ring class を追加 (単一 interactive element)
 *   - inner `<button>` を `<span>` に降格 (button-in-button 解消)
 *   - 旧 inner button の onClick (重複 setOpenItemId + e.stopPropagation) 削除
 *
 * 視覚 layout: 旧 hover:text-primary / hover:underline は削除 (単純化)、それ
 * 以外の color / spacing / size は不変。WCAG 4.1.2 Name/Role/Value 違反 解消、
 * WCAG 2.1.1 Keyboard 違反 解消。
 *
 * 機能追加なし、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (Inbox 描画) は
 *   workspace + item seed 必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/inbox-view.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. outer div role="button" + tabIndex + onKeyDown + aria-label
  if (
    /role="button"\s+tabIndex=\{0\}\s+onClick=\{\(\) => void setOpenItemId\(it\.id\)\}\s+onKeyDown=/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: outer div role="button" + tabIndex + onClick + onKeyDown OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: outer div interactive ARIA 配線 不在`,
    })
  }

  // 2. onKeyDown が Enter / Space の両方 + preventDefault
  if (/e\.key === 'Enter' \|\| e\.key === ' '/.test(src) && /e\.preventDefault\(\)/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: Enter/Space + preventDefault handler OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: Enter/Space handler 不在` })
  }

  // 3. inner <button> が <span> に降格していること (button-in-button 解消)
  if (/<button[\s\S]{0,200}?data-testid=\{`inbox-title-/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: inner <button> 残存 (regression — button-in-button 違反)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: inner <button> 不在 (button-in-button 解消)`,
    })
  }

  // 4. <span data-testid={`inbox-title-${it.id}`}> が代わりに存在
  if (
    /<span\s+className="truncate text-left font-medium"\s+data-testid=\{`inbox-title-\$\{it\.id\}`\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: <span data-testid="inbox-title-..."> OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 降格 <span> 不在` })
  }

  // 5. focus-visible ring class
  if (/focus-visible:ring-2/.test(src) && /focus-visible:outline-none/.test(src)) {
    findings.push({ level: 'info', message: `${path}: focus-visible ring 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: focus-visible ring 不在` })
  }

  console.log(`\n=== Findings (inbox-row-keyboard-iter429) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
