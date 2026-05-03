/**
 * Phase 6.15 loop iter 706 (mode-D Desktop a11y) —
 * decompose-proposals-panel header bulk actions row に role=group + aria-label 追加
 * (iter701-705 button group 化 sweep の続き)。
 *
 * 課題: decompose-proposals-panel.tsx 行 182 の bulk actions row `<div>` (全て採用 / 全て却下 /
 *   追加分解 / 再分解) は role / aria-label 無し。SR ナビで group context 不明。
 *
 * fix (1 ファイル ~5 行差分):
 *   - row に `role="group"` + `aria-label="AI 分解提案の bulk 操作 (全て採用 / 全て却下 / 再分解)"`
 *
 * iter701-705 と同 pattern。
 *
 * 検証: source-side regex assert + iter515-705 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. bulk actions row role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label="AI 分解提案の bulk 操作 \(全て採用 \/ 全て却下 \/ 再分解\)"/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `decompose bulk actions role=group + aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose bulk actions role=group + aria-label なし`,
    })
  }

  // 2. iter705 invariant: sprint-period-edit footer 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集 form 操作 \(キャンセル \/ 保存\)`\}/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter705 invariant: sprint-period-edit 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter705 invariant: 破壊` })
  }

  // 3. iter704 invariant: budget-panel actions 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/aria-label="AI 月次コスト上限編集の操作 \(キャンセル \/ 保存\)"/.test(bp)) {
    findings.push({ level: 'info', message: `iter704 invariant: budget-panel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter704 invariant: 破壊` })
  }

  // 4. iter656 invariant: decompose pulse 維持 (= decompose 同 file)
  if (/isAgentRunning \? 'motion-safe:animate-pulse' : ''/.test(dpp)) {
    findings.push({ level: 'info', message: `iter656 invariant: decompose pulse 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter656 invariant: 破壊` })
  }

  // 5. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  console.log(`\n=== Findings (decompose-bulk-actions-iter706) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
