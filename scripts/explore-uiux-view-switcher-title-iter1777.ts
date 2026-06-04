/**
 * Phase 6.15 loop iter1777: items-board view-switcher 9 button に title 付与
 * (Today/Inbox/Kanban/Backlog/Gantt/Dashboard/日次/週次/月次)。
 * iter1763-1775 icon-only title family と同 pattern を view-switcher にも展開、
 * view 選択 UX の sighted ↔ SR 同期。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/items-board.tsx の 9 view button は visible text のみ
 *   (Today / Inbox / ...) + aria-label で descriptive context を SR に提供するが、
 *   sighted は hover で各 view が何をする画面か即把握できなかった (aria-label は
 *   browser tooltip にならない)。
 *
 * 修正 (src/components/workspace/items-board.tsx, 9 line 追加 + 5 line comment):
 *   9 <Button> 全てに `title={同 aria-label}` 付与。aria-label / className /
 *   aria-pressed / data-testid / onClick 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-view-switcher-title-iter1777.ts
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

  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')

  // --- 1. 9 view button title 付与済 (literal text check) ---
  const expectedTitles = [
    'title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"',
    'title="Inbox — 未整理 / 未トリアージのタスク一覧"',
    'title="Kanban — status 別カラムで Item を可視化、DnD で status 移動"',
    'title="Backlog — Item 一覧テーブル、列ヘッダ click で sort、DnD で並び替え"',
    'title="Gantt — Item の期間 bar チャート、依存線 / critical path / 遅延を可視化"',
    'title="Dashboard — PDCA / 進捗 / 健全性 widget の集約画面"',
    'title="日次レビュー画面 — 個人 期間 = 今日"',
    'title="週次レビュー画面 — 個人 期間 = 今週"',
    'title="月次レビュー画面 — 個人 期間 = 今月"',
  ]
  for (const t of expectedTitles) {
    if (!board.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `items-board.tsx view-switcher ${t} が無い`,
      })
    }
  }

  // --- 2. aria-pressed 9 件維持 ---
  const ariaPressedCount = (board.match(/aria-pressed=\{view ===/g) ?? []).length
  if (ariaPressedCount !== 9) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `items-board.tsx aria-pressed 件数が ${ariaPressedCount} (期待 9)`,
    })
  }

  // --- 3. data-testid view-*-btn 9 件維持 ---
  const testIdCount = (board.match(/data-testid="view-[a-z]+-btn"/g) ?? []).length
  if (testIdCount !== 9) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `items-board.tsx view-*-btn data-testid 件数が ${testIdCount} (期待 9)`,
    })
  }

  // --- 4. iter1775 calendar today title 維持 ---
  const calendarView = readFileSync(
    resolve(here, '../src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    !calendarView.includes(
      "title={`今日 — 表示日を今日 (${format(new Date(), 'M月d日 (eee)')}) にリセット`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1775 calendar today title が消えている',
    })
  }

  // --- 5. iter1773 timeline-lane EventBlock title 維持 ---
  const timeline = readFileSync(
    resolve(here, '../src/components/schedule/timeline-lane.tsx'),
    'utf8',
  )
  if (!timeline.includes('title={fullLabel}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1773 timeline-lane EventBlock title が消えている',
    })
  }

  // --- 6. iter1771 schedule-item-picker title 維持 ---
  const picker = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (!picker.includes('title={it.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1771 schedule-item-picker title が消えている',
    })
  }

  // --- 7. iter1769 workflows-panel description title 維持 ---
  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (!wfPanel.includes('title={wf.description}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1769 workflows-panel description title が消えている',
    })
  }

  // --- 8. iter1732 prefers-reduced-motion helper 維持 ---
  const helper = readFileSync(resolve(here, '../src/lib/ui/prefers-reduced-motion.ts'), 'utf8')
  if (!helper.includes('export function prefersReducedMotion')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1732 prefers-reduced-motion helper が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — items-board view-switcher 9 button に title 付与で sighted hover で各 view の descriptive context disclose、iter1775-1732 invariant 不変',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
