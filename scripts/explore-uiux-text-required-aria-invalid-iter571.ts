/**
 * Phase 6.15 loop iter 571 (mode-D Desktop a11y) —
 * 3 form の text required Input に aria-invalid (whitespace-only) を補完
 * (iter570 sprint-name pattern を 3 件水平展開)。
 *
 * 課題: goals-panel goal-title (行 147-157) / kr-title (行 708+) /
 *   templates-panel tmpl-name (行 98-108) は required + aria-required を持つが
 *   aria-invalid 不在。スペースだけ入力で submit 不可だが SR には valid と伝わる。
 *
 * fix (2 ファイル ~3 行差分):
 *   - 各 input に aria-invalid={(value.length > 0 && value.trim() === '') || undefined}
 *
 * iter570 (sprint-name) pattern を 3 件水平展開、4 form 統一達成。
 *
 * 検証: source-side regex assert + iter515-570 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )

  // 1. goal-title aria-invalid
  if (
    /id="goal-title"[\s\S]*?aria-invalid=\{\(title\.length > 0 && title\.trim\(\) === ''\) \|\| undefined\}/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel.tsx: goal-title aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: goal-title aria-invalid 不在`,
    })
  }

  // 2. kr-title aria-invalid
  if (
    /data-testid=\{`kr-title-input-\$\{goalId\}`\}[\s\S]*?aria-invalid=\{\(krTitle\.length > 0 && krTitle\.trim\(\) === ''\) \|\| undefined\}/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel.tsx: kr-title aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: kr-title aria-invalid 不在`,
    })
  }

  // 3. tmpl-name aria-invalid
  if (
    /id="tmpl-name"[\s\S]*?aria-invalid=\{\(name\.length > 0 && name\.trim\(\) === ''\) \|\| undefined\}/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `templates-panel.tsx: tmpl-name aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel.tsx: tmpl-name aria-invalid 不在`,
    })
  }

  // 4. iter570 invariant: sprint-name aria-invalid 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /id="sprint-name"[\s\S]*?aria-invalid=\{\(name\.length > 0 && name\.trim\(\) === ''\) \|\| undefined\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter570 invariant: sprint-name aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter570 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (text-required-aria-invalid-iter571) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
