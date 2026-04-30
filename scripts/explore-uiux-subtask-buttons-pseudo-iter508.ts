/**
 * Phase 6.15 loop iter 508 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * SubtasksPanel の 3 inline icon button (drag handle / outdent / indent) の tap target を
 * pseudo で 44x44 化、iter505-507 pattern を 3 件水平展開。
 *
 * 課題: src/components/workspace/subtasks-panel.tsx の 3 inline button が共に WCAG 違反:
 *   - 行 156-165: GripVertical drag handle (h-4 w-4 = 16x16px)
 *   - 行 194-211: ArrowLeftFromLine outdent (h-3.5 w-3.5 = 14x14px)
 *   - 行 212-231: ArrowRightFromLine indent (同上)
 *
 *   Subtask row 内 inline で min-h-11 だと layout 崩壊。iter505-507 で確立した
 *   `relative + before:absolute before:-inset-3 before:content-['']` pattern + (outdent / indent
 *   は disabled state あり) `disabled:before:hidden` 付き。
 *
 *   drag handle は disabled 状態 (subtask の root drag 不可等) なし、disabled:before:hidden 不要。
 *
 * fix (1 ファイル ~6 行差分):
 *   - 3 button の className に pseudo extension 追加 (うち 2 件は disabled:before:hidden 付き)
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、aria-label / data-testid / aria-busy 維持。
 *
 * 検証: source-side regex assert + iter505-507 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/subtasks-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. drag handle pseudo 配線 (-ml-1 + cursor-grab + before:-inset-3)
  if (
    /className="text-muted-foreground hover:text-foreground relative -ml-1 cursor-grab touch-none active:cursor-grabbing before:absolute before:-inset-3 before:content-\[''\]"/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: drag handle pseudo 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: drag handle pseudo 配線 不在` })
  }

  // 2. outdent + indent pseudo + disabled:before:hidden 配線 (2 件、同 className)
  const outdentIndentMatches = src.match(
    /className="text-muted-foreground hover:text-foreground relative before:absolute before:-inset-3 before:content-\[''\] disabled:opacity-30 disabled:before:hidden"/g,
  )
  if (outdentIndentMatches && outdentIndentMatches.length === 2) {
    findings.push({
      level: 'info',
      message: `${path}: outdent + indent pseudo + disabled:before:hidden 配線 OK (2 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: outdent + indent pseudo 配線 不在 (期待 2 件 / 実際 ${outdentIndentMatches?.length ?? 0})`,
    })
  }

  // 3. 3 button の aria-label / data-testid 維持
  if (
    /data-testid=\{`subtask-drag-\$\{item\.id\}`\}/.test(src) &&
    /data-testid=\{`subtask-outdent-\$\{item\.id\}`\}/.test(src) &&
    /data-testid=\{`subtask-indent-\$\{item\.id\}`\}/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: 3 button data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: 3 button data-testid 破壊` })
  }

  // 4. iter505-507 invariant: 5 件の pseudo tap target 維持
  const checks = [
    { path: 'src/components/workspace/item-checkbox.tsx', label: 'iter505 ItemCheckbox' },
    { path: 'src/components/workspace/goals-panel.tsx', label: 'iter506 KR delete' },
    { path: 'src/components/workspace/kanban-view.tsx', label: 'iter506 Kanban edit' },
    { path: 'src/components/workspace/activity-log.tsx', label: 'iter507 activity disclosure' },
    { path: 'src/components/workspace/gantt-view.tsx', label: 'iter507 gantt jump-today' },
  ]
  for (const c of checks) {
    const s = readFileSync(resolve(process.cwd(), c.path), 'utf8')
    if (/before:absolute before:-inset-3/.test(s)) {
      findings.push({ level: 'info', message: `${c.path}: ${c.label} pseudo 維持 OK` })
    } else {
      findings.push({ level: 'warning', message: `${c.path}: ${c.label} pseudo 破壊` })
    }
  }

  console.log(`\n=== Findings (subtask-buttons-pseudo-iter508) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
