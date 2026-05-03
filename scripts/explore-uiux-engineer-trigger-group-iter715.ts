/**
 * Phase 6.15 loop iter 715 (mode-D Desktop a11y) —
 * engineer-trigger-button container に role=group + aria-label 追加
 * (iter701-714 button group sweep の続き、Engineer Agent 起動 widget)。
 *
 * 課題: engineer-trigger-button.tsx 行 59 の row `<div className="flex items-center gap-2">` は
 *   role / aria-label 無し。autoPr 切替 checkbox + Engineer 起動 Button が並ぶが、SR ユーザは
 *   「checkbox + button」と平坦に聞こえ、関連 controls として認識できない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - row に `role="group"` + `aria-label="Engineer Agent 起動 (PR 自動起票 toggle / 実装起動)"`
 *
 * 検証: source-side regex assert + iter701-714 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )

  // 1. engineer-trigger row role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label="Engineer Agent 起動 \(PR 自動起票 toggle \/ 実装起動\)"/.test(
      etb,
    )
  ) {
    findings.push({ level: 'info', message: `engineer-trigger row role=group + aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `engineer-trigger row role=group + aria-label なし`,
    })
  }

  // 2. iter714 invariant: workspace-header actions 維持
  const wh = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-header.tsx'),
    'utf8',
  )
  if (/aria-label="ヘッダー操作 \(ページ固有アクション \/ ユーティリティ\)"/.test(wh)) {
    findings.push({ level: 'info', message: `iter714 invariant: workspace-header 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter714 invariant: 破壊` })
  }

  // 3. iter709 invariant: active-timer actions 維持
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

  // 4. iter713 invariant: dashboard chips group 維持
  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (/role="group"/.test(dv)) {
    findings.push({ level: 'info', message: `iter713 invariant: dashboard chips group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter713 invariant: 破壊` })
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

  console.log(`\n=== Findings (engineer-trigger-group-iter715) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
