/**
 * Phase 6.15 loop iter 797 (mode-D Desktop a11y) —
 * calendar-view 日付ナビゲーション group の aria-label に現在の日付を含めて
 * dynamic 化 (iter764 workspace-header actions group page-specific naming pattern を
 * calendar-view に展開)。
 *
 * 課題: calendar-view.tsx 行 166 の group aria-label="カレンダー日付ナビゲーション
 *   (前日 / 翌日 / 今日)" は静的で、SR ユーザは group focus 時に「いつの日付を
 *   navigate しているか」 が分からなかった。h2 (aria-live) は内部要素で別 channel、
 *   group 入口で日付不明だった。iter764 (workspace-header actions group) と同 pattern。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `カレンダー日付ナビゲーション (現在: ${format(date)}、前日 / 翌日 / 今日)`
 *     に動的化
 *
 * 検証: source-side regex assert + iter735-796 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  const hasDynamicLabel =
    /aria-label=\{`カレンダー日付ナビゲーション \(現在: \$\{format\(date, 'yyyy年M月d日 \(eee\)'\)\}、前日 \/ 翌日 \/ 今日\)`\}/.test(
      cv,
    )
  const oldStaticGone = !cv.includes(
    'aria-label="カレンダー日付ナビゲーション (前日 / 翌日 / 今日)"',
  )
  if (hasDynamicLabel && oldStaticGone) {
    findings.push({
      level: 'info',
      message: `calendar-view 日付ナビゲーション group aria-label dynamic OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `calendar-view group aria-label 不完全 (dynamic=${hasDynamicLabel} oldGone=${oldStaticGone})`,
    })
  }

  // iter796 invariant: comment-thread own actions group aria-label
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」の操作 \(編集 \/ 削除、自分の投稿のみ\)`\}/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter796 invariant: comment-thread own actions group aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter796 invariant: 破壊` })
  }

  // iter795 invariant: comment-thread 編集 actions group aria-label dynamic
  if (
    /aria-label=\{`コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」の編集操作 \(キャンセル \/ 保存\)`\}/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter795 invariant: comment-thread 編集 actions group aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter795 invariant: 破壊` })
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

  console.log(`\n=== Findings (calendar-nav-group-iter797) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
