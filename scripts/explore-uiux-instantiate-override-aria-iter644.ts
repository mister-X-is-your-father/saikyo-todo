/**
 * Phase 6.15 loop iter 644 (mode-D Desktop a11y) —
 * instantiate-form override IMEInput aria-label を 3-state 動的化
 * (43 input 統一達成、template name 既存 expose)。
 *
 * 課題: instantiate-form.tsx 行 90-97 の override IMEInput は aria-label が
 *   `Template「${template.name}」展開時の root Item タイトル (省略時は「${template.name}」)`
 *   の static で文字数 / 上限が aria 側で expose されない。
 *
 * fix (1 ファイル ~7 行差分):
 *   - aria-label 3-state 動的化:
 *     - 空欄: 既存 hint + 「最大 500 文字」 注記
 *     - 上限近接 (>480): 文字数 + 上限近接
 *     - 通常: 文字数
 *
 * iter643 KR target/unit pattern を override に展開、saikyo-todo 内 動的
 * aria-label が 43 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-643 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ifo = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /override\.length === 0\s*\n?\s*\?\s*`Template「\$\{template\.name\}」展開時の root Item タイトル \(任意、最大 500 文字、省略時は「\$\{template\.name\}」\)`/.test(
      ifo,
    )
  ) {
    findings.push({ level: 'info', message: `override 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `override 空欄 hint なし` })
  }

  // 2. 上限近接 hint
  if (
    /override\.length > 480\s*\n?\s*\?\s*`root Item タイトル \(現在 \$\{override\.length\} \/ 500 文字、上限近接\)`/.test(
      ifo,
    )
  ) {
    findings.push({ level: 'info', message: `override 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `override 上限近接 hint なし` })
  }

  // 3. 通常 hint
  if (/:\s*`root Item タイトル \(現在 \$\{override\.length\} \/ 500 文字\)`/.test(ifo)) {
    findings.push({ level: 'info', message: `override 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `override 通常 hint なし` })
  }

  // 4. iter643 invariant: KR target 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/target === ''\s*\n?\s*\?\s*'目標値 \(KR を達成判定するための数値、decimal 可\)'/.test(gp)) {
    findings.push({ level: 'info', message: `iter643 invariant: KR target 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter643 invariant: 破壊` })
  }

  // 5. iter631 invariant: instantiate-var 維持
  if (/aria-label=\{\(\(\) => \{\s*\n?\s*const val = values\[v\] \?\? ''/.test(ifo)) {
    findings.push({ level: 'info', message: `iter631 invariant: instantiate-var 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter631 invariant: 破壊` })
  }

  // 6. iter642 invariant: goal-start 維持
  if (/startDate === ''\s*\n?\s*\?\s*'Goal 開始日 \(必須、終了日以前\)'/.test(gp)) {
    findings.push({ level: 'info', message: `iter642 invariant: goal-start 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter642 invariant: 破壊` })
  }

  console.log(`\n=== Findings (instantiate-override-aria-iter644) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
