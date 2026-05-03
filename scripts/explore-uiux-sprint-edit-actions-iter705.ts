/**
 * Phase 6.15 loop iter 705 (mode-D Desktop a11y) —
 * sprints-panel sprint-period-edit form footer + sprint-defaults edit footer に
 * role=group + aria-label 追加 (iter702-704 sweep の続き、同 file 内 2 footer まとめ)。
 *
 * 課題:
 *   - sprints-panel.tsx 行 652 の sprint-period-edit form footer (キャンセル / 保存)
 *   - 行 968 の sprint-defaults edit footer (キャンセル / 保存)
 *   両方とも role / aria-label 無し。
 *
 * fix (1 ファイル ~10 行差分、2 footer):
 *   - 期間編集 footer: dynamic aria-label `Sprint「${sprint.name}」の期間編集 form 操作 (キャンセル / 保存)`
 *   - defaults footer: `aria-label="Sprint デフォルト編集の操作 (キャンセル / 保存)"`
 *
 * 検証: source-side regex assert + iter515-704 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprint-period-edit footer role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集 form 操作 \(キャンセル \/ 保存\)`\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-period-edit footer role=group + aria-label OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-period-edit footer role=group + aria-label なし`,
    })
  }

  // 2. sprint-defaults edit footer role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label="Sprint デフォルト編集の操作 \(キャンセル \/ 保存\)"/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-defaults edit footer role=group + aria-label OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-defaults edit footer role=group + aria-label なし`,
    })
  }

  // 3. iter704 invariant: budget-panel actions 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/aria-label="AI 月次コスト上限編集の操作 \(キャンセル \/ 保存\)"/.test(bp)) {
    findings.push({ level: 'info', message: `iter704 invariant: budget-panel actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter704 invariant: 破壊` })
  }

  // 4. iter702 invariant: sprint-card actions 維持 (= sprints-panel 同 file)
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の操作 \(期間編集 \/ ステータス遷移 \/ Retro \/ Pre-mortem\)`\}/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter702 invariant: sprint-card actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter702 invariant: 破壊` })
  }

  // 5. iter703 invariant: goal-card actions 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Goal「\$\{goal\.title\}」のステータス操作 \(完了 \/ アーカイブ \/ 再開\)`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter703 invariant: goal-card actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter703 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-edit-actions-iter705) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
