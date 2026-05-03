/**
 * Phase 6.15 loop iter 711 (mode-D Desktop a11y) —
 * comment-thread 自分のコメント操作 row に role=group + aria-label 追加
 * (iter701-710 button group sweep の続き)。
 *
 * 課題: comment-thread.tsx 行 279 の自分の comment row 内 actions row `<div>`
 *   (編集 / 削除 button 群、isOwn=true 時のみ表示) は role / aria-label 無し。
 *
 * fix (1 ファイル ~5 行差分):
 *   - row に `role="group"` + `aria-label="自分のコメント操作 (編集 / 削除)"`
 *
 * 検証: source-side regex assert + iter515-710 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )

  // 1. comment isOwn actions row role=group + aria-label
  if (/role="group"\s*\n\s*aria-label="自分のコメント操作 \(編集 \/ 削除\)"/.test(ct)) {
    findings.push({ level: 'info', message: `comment isOwn actions role=group + aria OK` })
  } else {
    findings.push({ level: 'warning', message: `comment isOwn actions role=group + aria なし` })
  }

  // 2. iter710 invariant: integrations source-card actions 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Source「\$\{src\.name\}」の操作 \(pull \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter710 invariant: integrations actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter710 invariant: 破壊` })
  }

  // 3. iter709 invariant: active-timer actions 維持
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label="タスクタイマーの操作 \(一時停止 \/ 再開 \/ Picture-in-Picture \/ 停止\)"/.test(atp)
  ) {
    findings.push({ level: 'info', message: `iter709 invariant: active-timer 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter709 invariant: 破壊` })
  }

  // 4. iter707 invariant: decompose row actions 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`提案「\$\{proposal\.title\}」の操作 \(採用 \/ 却下\)`\}/.test(dpp)) {
    findings.push({ level: 'info', message: `iter707 invariant: decompose row 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter707 invariant: 破壊` })
  }

  // 5. iter701 invariant: gantt-summary group 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label="Gantt project summary \(表示範囲 \/ Item 数 \/ CPM 期間 \/ critical \/ baseline \/ 遅延\)"/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter701 invariant: gantt-summary 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter701 invariant: 破壊` })
  }

  console.log(`\n=== Findings (comment-actions-iter711) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
