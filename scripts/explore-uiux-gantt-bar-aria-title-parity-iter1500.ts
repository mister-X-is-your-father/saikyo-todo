/**
 * Phase 6.15 loop iter1500: gantt-view.tsx milestone / 通常 bar の aria-label を
 * title attribute と byte-identical な em-dash 形式に統一 (regression guard)。
 *
 * 経緯: gantt bar 2 種 (milestone / 通常) は role="button" で accessible name =
 * aria-label の値、mouse hover では title attribute が表示される。両 attribute は
 * 同じ情報を伝えるべきだが format divergence していた:
 *
 *   milestone bar:
 *     aria-label: `${title} (milestone ${date})${tags}${slipText}`
 *     title:      `${title} — ${date} (milestone)${tags}${slipText}`
 *
 *   通常 bar:
 *     aria-label: `${title} ${date1} → ${date2} (${spanDays}日)${tags}...${dragEnabled ? ' (ドラッグで期間移動)' : ''}`
 *     title:      `${title} — ${date1} → ${date2} (${spanDays}日)${tags}...${dragEnabled ? ' — ドラッグで期間移動' : ''}`
 *
 * SR ユーザは aria-label、mouse hover ユーザは title で異なる文字列を見る = 同じ要素の
 * description が divergent (WCAG 2.5.3 Label in Name の趣旨に反する)。
 *
 * 修正 (gantt-view.tsx):
 *   - 行 694 milestone aria-label: title (行 709) と byte-identical な em-dash 形式に統一
 *   - 行 722 通常 bar aria-label: title (行 765) と byte-identical な em-dash 形式に統一
 *
 * iter1093-1499 em-dash sweep convention とも整合 (title 側は元々 em-dash で正解、
 * aria-label 側がこぼれて旧 () を持っていた)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-gantt-bar-aria-title-parity-iter1500.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/components/workspace/gantt-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 1. milestone bar aria-label = title format に統一
  const milestoneExpectedAria =
    "aria-label={`${item.title} — ${format(start, 'yyyy-MM-dd')} (milestone)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}`}"
  if (!src.includes(milestoneExpectedAria)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'milestone bar aria-label が title と byte-identical な em-dash 形式でない',
    })
  }
  // 1b. 旧 paren 残存 check
  const milestoneOldAria =
    "aria-label={`${item.title} (milestone ${format(start, 'yyyy-MM-dd')})${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}`}"
  if (src.includes(milestoneOldAria)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'milestone bar 旧 paren `(milestone date)` aria-label が残存',
    })
  }

  // 2. 通常 bar aria-label = title format に統一
  const barExpectedAria =
    "aria-label={`${item.title} — ${format(start, 'yyyy-MM-dd')} → ${format(due, 'yyyy-MM-dd')} (${spanDays}日)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}${progressPct > 0 ? ` [進捗 ${progressPct}%]` : ''}${dragEnabled ? ' — ドラッグで期間移動' : ''}`}"
  if (!src.includes(barExpectedAria)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '通常 bar aria-label が title と byte-identical な em-dash 形式でない',
    })
  }
  // 2b. 旧形式残存 check (space + paren drag hint)
  const barOldAria =
    "aria-label={`${item.title} ${format(start, 'yyyy-MM-dd')} → ${format(due, 'yyyy-MM-dd')} (${spanDays}日)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}${progressPct > 0 ? ` [進捗 ${progressPct}%]` : ''}${dragEnabled ? ' (ドラッグで期間移動)' : ''}`}"
  if (src.includes(barOldAria)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '通常 bar 旧 space-separated + paren-drag-hint aria-label が残存',
    })
  }

  // 3. title 側は元々 em-dash 正解 — 維持 invariant
  const milestoneTitle =
    "title={`${item.title} — ${format(start, 'yyyy-MM-dd')} (milestone)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}`}"
  if (!src.includes(milestoneTitle)) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'milestone bar title (line ~709) em-dash 形式が破壊された',
    })
  }
  const barTitle =
    "title={`${item.title} — ${format(start, 'yyyy-MM-dd')} → ${format(due, 'yyyy-MM-dd')} (${spanDays}日)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}${progressPct > 0 ? ` [進捗 ${progressPct}%]` : ''}${dragEnabled ? ' — ドラッグで期間移動' : ''}`}"
  if (!src.includes(barTitle)) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: '通常 bar title (line ~765) em-dash 形式が破壊された',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — gantt milestone / 通常 bar aria-label が title と byte-identical な em-dash 形式',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
