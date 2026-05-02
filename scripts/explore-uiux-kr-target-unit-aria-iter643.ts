/**
 * Phase 6.15 loop iter 643 (mode-D Desktop a11y) —
 * goals-panel KR target + unit Input aria-label を 動的化
 * (42 input 統一達成、目標値 + 単位を相互参照)。
 *
 * 課題: goals-panel.tsx 行 777-794 の KR target + unit Input は static
 *   aria-label のみで current 値が aria 側で expose されない。target は
 *   number で NaN check も無し。
 *
 * fix (1 ファイル ~14 行差分、2 input):
 *   - target 3-state: 空欄 / 不正 (NaN) / 有効 (target + unit を一緒に expose)
 *   - unit 2-state: 空欄 (例示 hint) / 通常 (現在値 + 文字数)
 *
 * iter642 goal-dates pattern を KR target + unit に展開、saikyo-todo 内
 * 動的 aria-label が 42 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-642 invariant cross-check。
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

  // 1. target 空欄 hint
  if (/target === ''\s*\n?\s*\?\s*'目標値 \(KR を達成判定するための数値、decimal 可\)'/.test(gp)) {
    findings.push({ level: 'info', message: `target 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `target 空欄 hint なし` })
  }

  // 2. target NaN hint
  if (
    /Number\.isNaN\(Number\(target\)\)\s*\n?\s*\?\s*`目標値 \(現在値「\$\{target\}」 は数値として不正\)`/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `target NaN hint OK` })
  } else {
    findings.push({ level: 'warning', message: `target NaN hint なし` })
  }

  // 3. target 有効値 + unit 相互参照
  if (/:\s*`目標値 \(現在: \$\{target\}\$\{unit \? ` \$\{unit\}` : ''\}\)`/.test(gp)) {
    findings.push({ level: 'info', message: `target + unit 相互参照 OK` })
  } else {
    findings.push({ level: 'warning', message: `target + unit 相互参照なし` })
  }

  // 4. unit 空欄 hint
  if (
    /unit\.length === 0\s*\n?\s*\?\s*'単位 \(任意、最大 20 文字、目標値とセット — 例: 件 \/ % \/ hours\)'/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `unit 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `unit 空欄 hint なし` })
  }

  // 5. iter642 invariant: goal-start 維持
  if (/startDate === ''\s*\n?\s*\?\s*'Goal 開始日 \(必須、終了日以前\)'/.test(gp)) {
    findings.push({ level: 'info', message: `iter642 invariant: goal-start 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter642 invariant: 破壊` })
  }

  // 6. iter612 invariant: kr-title 維持
  if (
    /krTitle\.length === 0\s*\n?\s*\?\s*'KR タイトル \(必須、最大 300 文字、達成判定可能な数値目標が望ましい\)'/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter612 invariant: kr-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter612 invariant: 破壊` })
  }

  console.log(`\n=== Findings (kr-target-unit-aria-iter643) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
