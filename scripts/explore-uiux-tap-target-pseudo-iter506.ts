/**
 * Phase 6.15 loop iter 506 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * Kanban edit ✎ button + KR delete ✕ button の tap target を pseudo で 44x44 に拡張
 * (visual icon size 維持)、iter505 ItemCheckbox pattern を 2 件に水平展開。
 *
 * 課題: 2 button が共に小 inline icon button で WCAG 2.5.5 AAA 違反:
 *   - kanban-view.tsx 行 334-351: ✎ icon `text-xs px-1` (~24px wide x ~16px tall)
 *   - goals-panel.tsx 行 644-659: ✕ icon `text-xs` (~12px wide x ~16px tall)
 *
 *   両方とも row 内 inline で row layout が小 icon サイズに依存 → min-h-11 min-w-11 で
 *   button を 44x44 化すると row が崩れる。iter505 ItemCheckbox で確立した
 *   `relative + before:absolute before:-inset-3 before:content-['']` pattern を採用、
 *   visual icon size は維持しつつ tap target を 44x44 拡張。
 *
 * fix (2 ファイル ~4 行差分):
 *   - kanban edit ✎: className に `relative + before:absolute before:-inset-3 before:content-['']` 追加
 *   - KR delete ✕: 同 pattern + `disabled:before:hidden` で disabled 時 anchor 消す
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、aria-label / data-testid 維持。
 *
 * 検証: source-side regex assert + iter505 ItemCheckbox pattern 維持 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. kanban-view edit ✎ button に pseudo tap target 配線
  const kanbanPath = 'src/components/workspace/kanban-view.tsx'
  const kanbanSrc = readFileSync(resolve(process.cwd(), kanbanPath), 'utf8')
  if (
    /className="text-muted-foreground hover:text-foreground relative rounded px-1 text-xs before:absolute before:-inset-3 before:content-\[''\]"/.test(
      kanbanSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${kanbanPath}: kanban edit ✎ button pseudo tap target 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${kanbanPath}: kanban edit ✎ button pseudo tap target 配線 不在`,
    })
  }

  // 2. kanban edit aria-label / data-testid / ✎ char 維持
  if (
    /aria-label=\{`「\$\{item\.title\}」を編集`\}/.test(kanbanSrc) &&
    /data-testid=\{`kanban-edit-\$\{item\.id\}`\}/.test(kanbanSrc) &&
    /<span aria-hidden="true">✎<\/span>/.test(kanbanSrc)
  ) {
    findings.push({ level: 'info', message: `${kanbanPath}: aria-label / data-testid / ✎ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${kanbanPath}: aria-label / data-testid / ✎ 破壊` })
  }

  // 3. goals-panel KR delete ✕ button に pseudo tap target 配線
  const goalsPath = 'src/components/workspace/goals-panel.tsx'
  const goalsSrc = readFileSync(resolve(process.cwd(), goalsPath), 'utf8')
  if (
    /className="text-muted-foreground hover:text-destructive relative text-xs before:absolute before:-inset-3 before:content-\[''\] disabled:opacity-50 disabled:before:hidden"/.test(
      goalsSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${goalsPath}: KR delete ✕ button pseudo tap target + disabled:before:hidden 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${goalsPath}: KR delete ✕ button pseudo tap target 配線 不在`,
    })
  }

  // 4. KR delete aria-label / data-testid / ✕ char 維持
  if (
    /aria-label=\{[\s\S]{0,300}?KR「\$\{kr\.title\}」を削除/.test(goalsSrc) &&
    /data-testid=\{`kr-delete-\$\{kr\.id\}`\}/.test(goalsSrc) &&
    /<span aria-hidden="true">✕<\/span>/.test(goalsSrc)
  ) {
    findings.push({ level: 'info', message: `${goalsPath}: aria-label / data-testid / ✕ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${goalsPath}: aria-label / data-testid / ✕ 破壊` })
  }

  // 5. iter505 invariant: ItemCheckbox pseudo pattern 維持
  const checkboxSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-checkbox.tsx'),
    'utf8',
  )
  if (
    /relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors before:absolute before:-inset-3 before:rounded-full before:content-\[''\] disabled:before:hidden/.test(
      checkboxSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `src/components/workspace/item-checkbox.tsx: iter505 invariant (ItemCheckbox pseudo pattern) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src/components/workspace/item-checkbox.tsx: iter505 invariant 破壊`,
    })
  }

  console.log(`\n=== Findings (tap-target-pseudo-iter506) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
