/**
 * Phase 6.15 loop iter1494: items-board.tsx view switcher 9 button (Today / Inbox /
 * Kanban / Backlog / Gantt / Dashboard / 日次 / 週次 / 月次) の aria-label を em-dash 統一
 * (regression guard、iter798 の paren format からの migration)。
 *
 * iter798 で 6 main button (Today-Dashboard) に functional aria-label 追加、iter1093-1493
 * em-dash sweep で codebase 全体の visible-prefix button aria-label を em-dash 区切に統一
 * 済だが、items-board view-switcher は 9 button 全てが旧 () 区切で残っていた。
 *
 * 修正 (items-board.tsx):
 *   各 button aria-label の `<visible> (<descriptive>)` を `<visible> — <descriptive>` に
 *   変換。visible-prefix は無変更で voice control prefix-matching 維持。
 *   - Today / Inbox / Kanban / Backlog / Gantt / Dashboard (6 main view button)
 *   - 日次レビュー画面 / 週次レビュー画面 / 月次レビュー画面 (3 personal review view button)
 *
 * 連動更新 (scripts/explore-uiux-view-switcher-aria-label-iter798.ts):
 *   regex 形式を () → em-dash に migration。iter798 検証目的 = functional content 存在
 *   guard であり区切 punctuation は本質的 invariant ではないため新 convention に追従。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-items-board-view-switcher-em-dash-iter1494.ts
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
  const filePath = resolve(here, '../src/components/workspace/items-board.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 1. 9 button 新 em-dash 形式
  const expected: Array<[string, string]> = [
    ['Today', 'aria-label="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"'],
    ['Inbox', 'aria-label="Inbox — 未整理 / 未トリアージのタスク一覧"'],
    ['Kanban', 'aria-label="Kanban — status 別カラムで Item を可視化、DnD で status 移動"'],
    ['Backlog', 'aria-label="Backlog — Item 一覧テーブル、列ヘッダ click で sort、DnD で並び替え"'],
    [
      'Gantt',
      'aria-label="Gantt — Item の期間 bar チャート、依存線 / critical path / 遅延を可視化"',
    ],
    ['Dashboard', 'aria-label="Dashboard — PDCA / 進捗 / 健全性 widget の集約画面"'],
    ['日次', 'aria-label="日次レビュー画面 — 個人 期間 = 今日"'],
    ['週次', 'aria-label="週次レビュー画面 — 個人 期間 = 今週"'],
    ['月次', 'aria-label="月次レビュー画面 — 個人 期間 = 今月"'],
  ]
  for (const [name, expectedLabel] of expected) {
    if (!src.includes(expectedLabel)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `items-board ${name} button aria-label が em-dash 形式 (${expectedLabel.slice(0, 50)}…) でない`,
      })
    }
  }

  // 2. 旧 () 形式残存 check
  const old: Array<[string, string]> = [
    ['Today', 'aria-label="Today (今日のタスク優先順、scheduledFor=今日 + 期限近接)"'],
    ['Inbox', 'aria-label="Inbox (未整理 / 未トリアージのタスク一覧)"'],
    ['Kanban', 'aria-label="Kanban (status 別カラムで Item を可視化、DnD で status 移動)"'],
    ['Backlog', 'aria-label="Backlog (Item 一覧テーブル、列ヘッダ click で sort、DnD で並び替え)"'],
    [
      'Gantt',
      'aria-label="Gantt (Item の期間 bar チャート、依存線 / critical path / 遅延を可視化)"',
    ],
    ['Dashboard', 'aria-label="Dashboard (PDCA / 進捗 / 健全性 widget の集約画面)"'],
    ['日次', 'aria-label="日次レビュー画面 (個人 期間 = 今日)"'],
    ['週次', 'aria-label="週次レビュー画面 (個人 期間 = 今週)"'],
    ['月次', 'aria-label="月次レビュー画面 (個人 期間 = 今月)"'],
  ]
  for (const [name, oldLabel] of old) {
    if (src.includes(oldLabel)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `items-board ${name} button 旧 () 区切 aria-label が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — items-board view-switcher 9 button が em-dash convention 統一済')
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
