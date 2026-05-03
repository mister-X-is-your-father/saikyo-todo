/**
 * Phase 6.15 loop iter 714 (mode-D Desktop a11y) —
 * workspace-header actions row (pageActions + utility) に role=group + aria-label 追加
 * (iter701-713 button group sweep の続き、共通 header layout)。
 *
 * 課題: workspace-header.tsx 行 34 の actions row `<div>` (pageActions + NotificationBell /
 *   ThemeToggle / Settings 等の utility) は role / aria-label 無し。SR ユーザは
 *   「button + button + button …」と平坦に聞こえ、ヘッダーの操作群と把握できない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - row に `role="group"` + `aria-label="ヘッダー操作 (ページ固有アクション / ユーティリティ)"`
 *
 * 検証: source-side regex assert + iter515-713 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wh = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-header.tsx'),
    'utf8',
  )

  // 1. workspace-header actions role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label="ヘッダー操作 \(ページ固有アクション \/ ユーティリティ\)"/.test(
      wh,
    )
  ) {
    findings.push({ level: 'info', message: `workspace-header actions role=group + aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-header actions role=group + aria-label なし`,
    })
  }

  // 2. iter709 invariant: active-timer actions 維持
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label="タスクタイマーの操作 \(一時停止 \/ 再開 \/ Picture-in-Picture \/ 停止\)"/.test(atp)
  ) {
    findings.push({ level: 'info', message: `iter709 invariant: active-timer actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter709 invariant: 破壊` })
  }

  // 3. iter713 invariant: dashboard chips row group 維持
  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (/role="group"/.test(dv)) {
    findings.push({ level: 'info', message: `iter713 invariant: dashboard chips group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter713 invariant: 破壊` })
  }

  // 4. iter711 invariant: comment-thread isOwn actions 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (/role="group"/.test(ct)) {
    findings.push({ level: 'info', message: `iter711 invariant: comment-thread group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter711 invariant: 破壊` })
  }

  // 5. iter701 invariant: gantt-summary group 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label="Gantt project summary \(表示範囲 \/ Item 数 \/ CPM 期間 \/ critical \/ baseline \/ 遅延\)"/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter701 invariant: gantt-summary group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter701 invariant: 破壊` })
  }

  console.log(`\n=== Findings (workspace-header-actions-iter714) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
