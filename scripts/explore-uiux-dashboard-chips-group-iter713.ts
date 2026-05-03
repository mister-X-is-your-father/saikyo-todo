/**
 * Phase 6.15 loop iter 713 (mode-D Desktop a11y) —
 * dashboard-view trend / hygiene chips 行に role=group + aria-label 追加
 * (Dashboard 健全性 8+ chip 群を 1 group として識別)。
 *
 * 課題: dashboard-view.tsx 行 880 の trend / hygiene chips row `<div>` (urgency /
 *   velocity / momentum / due-coverage / dod-coverage / aging / due-hit-rate / slip /
 *   completion-gap / wip-bias 等の 8+ chip 群) は role / aria-label 無し。SR ナビで
 *   多数 chip がただ並んでいる状態、健全性 chip 群という group context 不明。
 *
 * fix (1 ファイル ~5 行差分):
 *   - row に `role="group"` + descriptive aria-label
 *
 * 検証: source-side regex assert + iter515-712 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )

  // 1. dashboard chips row role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label="Dashboard 健全性 chip 群 \(urgency \/ velocity \/ momentum \/ due-coverage \/ dod-coverage \/ aging \/ due-hit-rate \/ slip \/ completion-gap \/ wip-bias\)"/.test(
      dv,
    )
  ) {
    findings.push({ level: 'info', message: `dashboard chips row role=group + aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `dashboard chips row role=group + aria-label なし`,
    })
  }

  // 2. iter712 invariant: comment edit form footer 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (/aria-label="コメント編集の操作 \(キャンセル \/ 保存\)"/.test(ct)) {
    findings.push({ level: 'info', message: `iter712 invariant: comment edit footer 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter712 invariant: 破壊` })
  }

  // 3. iter711 invariant: comment isOwn actions 維持
  if (/aria-label="自分のコメント操作 \(編集 \/ 削除\)"/.test(ct)) {
    findings.push({ level: 'info', message: `iter711 invariant: comment isOwn actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter711 invariant: 破壊` })
  }

  // 4. iter710 invariant: integrations actions 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Source「\$\{src\.name\}」の操作 \(pull \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter710 invariant: integrations 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter710 invariant: 破壊` })
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

  console.log(`\n=== Findings (dashboard-chips-group-iter713) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
