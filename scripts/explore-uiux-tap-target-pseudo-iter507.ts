/**
 * Phase 6.15 loop iter 507 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * activity-log disclosure + gantt-jump-today raw button の tap target を pseudo で
 * 44x44 化、iter505 / iter506 pattern を 2 件水平展開。
 *
 * 課題: 2 button が共に小 inline raw button で WCAG 2.5.5 AAA 違反:
 *   - activity-log.tsx 行 185-194: 「詳細を見る」 disclosure (text-[11px] underline ~14x14px)
 *   - gantt-view.tsx 行 364-374: 「今日へジャンプ」 (text-xs px-2 py-0.5 ~80x20px)
 *
 *   両方とも row / banner 内 inline で min-h-11 だと layout 崩壊。iter505 / iter506 で
 *   確立した `relative + before:absolute before:-inset-3 before:content-['']` pattern を採用。
 *
 * fix (2 ファイル ~4 行差分):
 *   - activity-log: pseudo extension + data-testid 追加
 *   - gantt-view: pseudo extension のみ追加 (data-testid 既存)
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、aria-label / aria-expanded / aria-controls 維持。
 *
 * 検証: source-side regex assert + iter505 / iter506 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. activity-log disclosure に pseudo tap target 配線
  const activityPath = 'src/components/workspace/activity-log.tsx'
  const activitySrc = readFileSync(resolve(process.cwd(), activityPath), 'utf8')
  if (
    /className="text-muted-foreground relative mt-1 text-\[11px\] underline before:absolute before:-inset-3 before:content-\[''\]"/.test(
      activitySrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${activityPath}: activity-log disclosure pseudo tap target 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${activityPath}: activity-log disclosure pseudo tap target 配線 不在`,
    })
  }

  // 2. activity-log disclosure に data-testid 追加
  if (/data-testid=\{`activity-detail-toggle-\$\{entry\.id\}`\}/.test(activitySrc)) {
    findings.push({ level: 'info', message: `${activityPath}: data-testid 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${activityPath}: data-testid 配線 不在` })
  }

  // 3. activity-log disclosure aria-expanded + aria-controls 維持
  if (
    /aria-expanded=\{open\}/.test(activitySrc) &&
    /aria-controls=\{detailId\}/.test(activitySrc)
  ) {
    findings.push({
      level: 'info',
      message: `${activityPath}: aria-expanded + aria-controls 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${activityPath}: aria-expanded + aria-controls 破壊`,
    })
  }

  // 4. gantt-jump-today に pseudo tap target 配線
  const ganttPath = 'src/components/workspace/gantt-view.tsx'
  const ganttSrc = readFileSync(resolve(process.cwd(), ganttPath), 'utf8')
  if (
    /className="text-foreground hover:bg-muted relative rounded border px-2 py-0\.5 text-xs before:absolute before:-inset-3 before:content-\[''\]"/.test(
      ganttSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${ganttPath}: gantt-jump-today pseudo tap target 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${ganttPath}: gantt-jump-today pseudo tap target 配線 不在`,
    })
  }

  // 5. gantt-jump-today aria-label + data-testid 維持
  if (
    /data-testid="gantt-jump-today"/.test(ganttSrc) &&
    /aria-label="Gantt timeline を今日の縦線まで横スクロール"/.test(ganttSrc)
  ) {
    findings.push({ level: 'info', message: `${ganttPath}: aria-label + data-testid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${ganttPath}: aria-label + data-testid 破壊` })
  }

  // 6. iter505 / iter506 invariant: 3 件の pseudo tap target 維持
  const checkboxSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-checkbox.tsx'),
    'utf8',
  )
  const goalsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const kanbanSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (
    /before:absolute before:-inset-3/.test(checkboxSrc) &&
    /before:absolute before:-inset-3/.test(goalsSrc) &&
    /before:absolute before:-inset-3/.test(kanbanSrc)
  ) {
    findings.push({
      level: 'info',
      message: `iter505 + iter506 invariant (ItemCheckbox + KR delete + Kanban edit pseudo) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter505 + iter506 invariant 破壊`,
    })
  }

  console.log(`\n=== Findings (tap-target-pseudo-iter507) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
