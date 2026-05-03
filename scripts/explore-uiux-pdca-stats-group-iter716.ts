/**
 * Phase 6.15 loop iter 716 (mode-D Desktop a11y) —
 * pdca-panel 上部の Plan/Do/Check/Act stat 4 cards grid に role=group + aria-label 追加
 * (iter701-715 button group sweep の続き、PDCA 集計 widget)。
 *
 * 課題: pdca-panel.tsx 行 85 の `<div className="grid grid-cols-2 gap-2 md:grid-cols-4">` は
 *   role / aria-label 無し。4 枚の PdcaStat (Plan/Do/Check/Act) を含む group だが SR ユーザは
 *   「Plan + 数 + Do + 数 + Check + 数 + Act + 数」と平坦に聞こえ、PDCA cycle として把握できない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - grid に `role="group"` + `aria-label="PDCA 4 段階の集計 (Plan / Do / Check / Act)"`
 *
 * 検証: source-side regex assert + iter701-715 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )

  // 1. pdca stats grid role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label="PDCA 4 段階の集計 \(Plan \/ Do \/ Check \/ Act\)"/.test(pdca)
  ) {
    findings.push({ level: 'info', message: `pdca stats grid role=group + aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `pdca stats grid role=group + aria-label なし`,
    })
  }

  // 2. iter715 invariant: engineer-trigger row group 維持
  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (/aria-label="Engineer Agent 起動 \(PR 自動起票 toggle \/ 実装起動\)"/.test(etb)) {
    findings.push({ level: 'info', message: `iter715 invariant: engineer-trigger 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter715 invariant: 破壊` })
  }

  // 3. iter714 invariant: workspace-header actions 維持
  const wh = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-header.tsx'),
    'utf8',
  )
  if (/aria-label="ヘッダー操作 \(ページ固有アクション \/ ユーティリティ\)"/.test(wh)) {
    findings.push({ level: 'info', message: `iter714 invariant: workspace-header 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter714 invariant: 破壊` })
  }

  // 4. iter709 invariant: active-timer actions 維持
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

  console.log(`\n=== Findings (pdca-stats-group-iter716) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
