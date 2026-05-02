/**
 * Phase 6.15 loop iter 613 (mode-D Desktop a11y) —
 * templates-panel tmpl-name IMEInput aria-label を 4-state 動的化。
 *
 * 課題: templates-panel.tsx 行 97-110 の tmpl-name IMEInput は <Label htmlFor>
 *   のみで文字数 / 上限が aria 側で expose されない。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 4-state 動的化 (max 200):
 *     - 空欄: 'Template 名前 (必須、最大 200 文字、何を生成するかが分かる名前)'
 *     - 空白のみ: `Template 名前 (現在 ${length} / 200 文字、空白のみは不正)`
 *     - 上限近接 (>180): `Template 名前 (現在 ${length} / 200 文字、上限近接)`
 *     - 通常: `Template 名前 (現在 ${length} / 200 文字)`
 *
 * iter610 editTitle / iter611 sprint-name / iter612 goal-title pattern を
 * tmpl-name に展開、saikyo-todo 内 4-state 動的 aria-label が 5 input 統一達成
 * (item.title / sprint.name / goal.title / kr.title / template.name)。
 *
 * 検証: source-side regex assert + iter515-612 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )

  // 1. tmpl-name 空欄 hint
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Template 名前 \(必須、最大 200 文字、何を生成するかが分かる名前\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `tmpl-name 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-name 空欄 hint なし` })
  }

  // 2. tmpl-name 空白のみ hint
  if (
    /name\.trim\(\) === ''\s*\n?\s*\?\s*`Template 名前 \(現在 \$\{name\.length\} \/ 200 文字、空白のみは不正\)`/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `tmpl-name 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-name 空白のみ hint なし` })
  }

  // 3. tmpl-name 上限近接 hint
  if (
    /name\.length > 180\s*\n?\s*\?\s*`Template 名前 \(現在 \$\{name\.length\} \/ 200 文字、上限近接\)`/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `tmpl-name 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-name 上限近接 hint なし` })
  }

  // 4. tmpl-name 通常 hint
  if (/:\s*`Template 名前 \(現在 \$\{name\.length\} \/ 200 文字\)`/.test(tp)) {
    findings.push({ level: 'info', message: `tmpl-name 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-name 通常 hint なし` })
  }

  // 5. iter612 invariant: goal-title 4-state 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /title\.length === 0\s*\n?\s*\?\s*'Goal Objective \(必須、最大 200 文字、なに \/ なぜを 1 行で\)'/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter612 invariant: goal-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter612 invariant: 破壊` })
  }

  // 6. iter611 invariant: sprint-name 4-state 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/name\.length === 0\s*\n?\s*\?\s*'Sprint 名前 \(必須、最大 100 文字\)'/.test(sp)) {
    findings.push({ level: 'info', message: `iter611 invariant: sprint-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter611 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tmpl-name-aria-iter613) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
