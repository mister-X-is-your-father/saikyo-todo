/**
 * Phase 6.15 loop iter 798 (mode-D Desktop a11y) —
 * items-board view switcher の 6 main button (Today/Inbox/Kanban/Backlog/Gantt/Dashboard)
 * に functional aria-label 追加 (Daily/Weekly/Monthly button との対称性確保)。
 *
 * 課題: items-board.tsx 行 221-280 の 6 main view button (Today / Inbox / Kanban /
 *   Backlog / Gantt / Dashboard) は visible text のみで aria-label が無い。
 *   一方、行 282-313 の Daily / Weekly / Monthly button は aria-label に
 *   "日次レビュー画面 (個人 期間 = 今日)" 等の functional context を持つ。
 *   SR ユーザは英単語 view 名 (Today / Backlog 等) のみで意味を推察する必要があった。
 *   button group 内 9 button の aria-label 統一性を完成させる。
 *
 * fix (1 ファイル ~6 行差分、6 button 各々に aria-label 1 行):
 *   - Today: "Today (今日のタスク優先順、scheduledFor=今日 + 期限近接)"
 *   - Inbox: "Inbox (未整理 / 未トリアージのタスク一覧)"
 *   - Kanban: "Kanban (status 別カラムで Item を可視化、DnD で status 移動)"
 *   - Backlog: "Backlog (Item 一覧テーブル、列ヘッダ click で sort、DnD で並び替え)"
 *   - Gantt: "Gantt (Item の期間 bar チャート、依存線 / critical path / 遅延を可視化)"
 *   - Dashboard: "Dashboard (PDCA / 進捗 / 健全性 widget の集約画面)"
 *
 *   各 visible text を aria-label の先頭に保持 (WCAG 2.5.3 Label in Name 準拠)。
 *
 * 検証: source-side regex assert + iter735-797 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  // iter1494: iter1093-1493 em-dash sweep に合わせ regex 形式を () → em-dash に migration
  // (iter798 の検証目的 = visible-prefix + functional descriptive content が aria-label に
  // ある事の guard。区切 punctuation 変更は本質的 invariant ではないため新 convention に追従)
  const checks: Array<[string, RegExp]> = [
    ['Today', /aria-label="Today — 今日のタスク優先順、scheduledFor=今日 \+ 期限近接"/],
    ['Inbox', /aria-label="Inbox — 未整理 \/ 未トリアージのタスク一覧"/],
    ['Kanban', /aria-label="Kanban — status 別カラムで Item を可視化、DnD で status 移動"/],
    ['Backlog', /aria-label="Backlog — Item 一覧テーブル、列ヘッダ click で sort、DnD で並び替え"/],
    [
      'Gantt',
      /aria-label="Gantt — Item の期間 bar チャート、依存線 \/ critical path \/ 遅延を可視化"/,
    ],
    ['Dashboard', /aria-label="Dashboard — PDCA \/ 進捗 \/ 健全性 widget の集約画面"/],
  ]
  let allOk = true
  for (const [name, re] of checks) {
    if (!re.test(ib)) {
      allOk = false
      findings.push({
        level: 'warning',
        message: `items-board ${name} button aria-label 不完全`,
      })
    }
  }
  if (allOk) {
    findings.push({
      level: 'info',
      message: `items-board view switcher 6 main button aria-label functional context OK`,
    })
  }

  // iter797 invariant: calendar-view nav group dynamic
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`カレンダー日付ナビゲーション \(現在: \$\{format\(date, 'yyyy年M月d日 \(eee\)'\)\}、前日 \/ 翌日 \/ 今日\)`\}/.test(
      cv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter797 invariant: calendar-view nav group aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter797 invariant: 破壊` })
  }

  // iter795/796 invariant: comment-thread actions group aria-label dynamic
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」の編集操作 \(キャンセル \/ 保存\)`\}/.test(
      ct,
    ) &&
    /aria-label=\{`コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」の操作 \(編集 \/ 削除、自分の投稿のみ\)`\}/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter795/796 invariant: comment-thread 編集 + own actions group aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter795/796 invariant: 破壊` })
  }

  // iter793 invariant: sprint-edit form aria-label dynamic
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Sprint「\$\{sprint\.name\}」期間編集フォーム`\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter793 invariant: sprint-edit form aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter793 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (view-switcher-aria-label-iter798) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
