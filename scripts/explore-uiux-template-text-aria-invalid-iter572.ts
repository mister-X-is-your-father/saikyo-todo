/**
 * Phase 6.15 loop iter 572 (mode-D Desktop a11y) —
 * 2 template form の text required Input に aria-invalid (whitespace-only) を補完
 * (iter570/571 pattern を完成)。
 *
 * 課題: template-items-editor 子 Item title (行 95-104) /
 *   instantiate-form Mustache 変数 input (行 107-115) は required + aria-required を
 *   持つが aria-invalid 不在。
 *
 * fix (2 ファイル ~3 行差分):
 *   - 子 Item title に aria-invalid={(title.length > 0 && title.trim() === '') || undefined}
 *   - 変数 input に aria-invalid={((values[v] ?? '').length > 0 && (values[v] ?? '').trim() === '') || undefined}
 *
 * iter570/571 pattern を 2 件水平展開、6 form text required input 統一達成。
 *
 * 検証: source-side regex assert + iter515-571 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  const inst = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )

  // 1. template-items-editor 子 Item title aria-invalid
  if (
    /aria-label="子 Item のタイトル"[\s\S]*?aria-invalid=\{\(title\.length > 0 && title\.trim\(\) === ''\) \|\| undefined\}/.test(
      tie,
    )
  ) {
    findings.push({
      level: 'info',
      message: `template-items-editor.tsx: 子 Item title aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor.tsx: 子 Item title aria-invalid 不在`,
    })
  }

  // 2. instantiate-form 変数 input aria-invalid
  if (
    /id=\{`var-\$\{template\.id\}-\$\{v\}`\}[\s\S]*?aria-invalid=\{[\s\S]*?values\[v\] \?\? ''[\s\S]*?\.length > 0[\s\S]*?\.trim\(\) === ''/.test(
      inst,
    )
  ) {
    findings.push({
      level: 'info',
      message: `instantiate-form.tsx: 変数 input aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `instantiate-form.tsx: 変数 input aria-invalid 不在`,
    })
  }

  // 3. iter571 invariant: goal-title aria-invalid 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /id="goal-title"[\s\S]*?aria-invalid=\{\(title\.length > 0 && title\.trim\(\) === ''\)/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter571 invariant: goal-title aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter571 invariant: 破壊`,
    })
  }

  // 4. iter570 invariant: sprint-name aria-invalid 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /id="sprint-name"[\s\S]*?aria-invalid=\{\(name\.length > 0 && name\.trim\(\) === ''\)/.test(sp)
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

  console.log(`\n=== Findings (template-text-aria-invalid-iter572) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
