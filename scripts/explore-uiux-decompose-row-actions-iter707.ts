/**
 * Phase 6.15 loop iter 707 (mode-D Desktop a11y) —
 * decompose-proposals-panel proposal row 内 2 button group
 * (edit form footer + 採用/却下 actions) に role=group + aria-label 追加。
 *
 * 課題:
 *   - decompose-proposals-panel.tsx 行 455 の edit form footer (キャンセル / 保存) は role / aria-label 無し
 *   - 行 516 の 提案行 actions (採用 / 却下) は role / aria-label 無し
 *
 * fix (1 ファイル ~10 行差分、2 button group):
 *   - edit form footer: dynamic `aria-label={`提案「${proposal.title}」の編集 form 操作 (キャンセル / 保存)`}`
 *   - row actions: dynamic `aria-label={`提案「${proposal.title}」の操作 (採用 / 却下)`}`
 *
 * iter701-706 と同 pattern。
 *
 * 検証: source-side regex assert + iter515-706 invariant cross-check。
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

  // 1. edit form footer role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label=\{`提案「\$\{proposal\.title\}」の編集 form 操作 \(キャンセル \/ 保存\)`\}/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `proposal edit form footer role=group + aria OK` })
  } else {
    findings.push({ level: 'warning', message: `proposal edit form footer role=group + aria なし` })
  }

  // 2. row actions role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label=\{`提案「\$\{proposal\.title\}」の操作 \(採用 \/ 却下\)`\}/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `proposal row actions role=group + aria OK` })
  } else {
    findings.push({ level: 'warning', message: `proposal row actions role=group + aria なし` })
  }

  // 3. iter706 invariant: bulk actions group 維持
  if (
    /role="group"\s*\n\s*aria-label="AI 分解提案の bulk 操作 \(全て採用 \/ 全て却下 \/ 再分解\)"/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `iter706 invariant: bulk actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter706 invariant: 破壊` })
  }

  // 4. iter705 invariant: sprint-period-edit footer 維持
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

  // 5. iter704 invariant: budget-panel actions 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/aria-label="AI 月次コスト上限編集の操作 \(キャンセル \/ 保存\)"/.test(bp)) {
    findings.push({ level: 'info', message: `iter704 invariant: budget-panel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter704 invariant: 破壊` })
  }

  console.log(`\n=== Findings (decompose-row-actions-iter707) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
