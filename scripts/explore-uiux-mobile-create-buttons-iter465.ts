/**
 * Phase 6.15 loop iter 465 (mode-D source-side audit) — Goals/Templates の
 * primary create button 群を 44x44 化 (iter460-464 mobile sweep の続編、
 * 4 件目)。
 *
 * 課題: source 探索で以下の primary submit button が `min-h-11` を持たず default
 * Button h-9=36px (mobile WCAG 2.5.5 AAA 違反):
 *   1. goals-panel.tsx: goal-create-btn (Goal 作成)
 *   2. goals-panel.tsx: kr-add-btn-${goalId} (KR 追加 size="sm")
 *   3. templates-panel.tsx: template 作成 button
 *
 * fix: 2 ファイル ~3 行差分。
 *   - 各 Button に `className="min-h-11"` 追加 (iter460-464 と同 pattern)
 *
 * 機能追加なし、視覚 layout は height のみ 36/32→44px、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const goalsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const templatesSrc = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )

  // 1. goal-create-btn min-h-11
  if (
    /<Button\s+type="submit"\s+className="min-h-11"\s+disabled=\{!title\.trim\(\) \|\| createMut\.isPending\}[\s\S]{0,200}?data-testid="goal-create-btn"/.test(
      goalsSrc,
    )
  ) {
    findings.push({ level: 'info', message: `goals-panel.tsx: goal-create-btn min-h-11 OK` })
  } else {
    findings.push({ level: 'warning', message: `goals-panel.tsx: goal-create-btn min-h-11 不在` })
  }

  // 2. kr-add-btn min-h-11
  if (
    /<Button\s+type="submit"\s+size="sm"\s+className="min-h-11"\s+disabled=\{!krTitle\.trim\(\)/.test(
      goalsSrc,
    )
  ) {
    findings.push({ level: 'info', message: `goals-panel.tsx: kr-add-btn min-h-11 OK` })
  } else {
    findings.push({ level: 'warning', message: `goals-panel.tsx: kr-add-btn min-h-11 不在` })
  }

  // 3. template create button min-h-11
  if (
    /<Button\s+type="submit"\s+className="min-h-11"\s+disabled=\{createMut\.isPending \|\| !name\.trim\(\)/.test(
      templatesSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `templates-panel.tsx: template create min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel.tsx: template create min-h-11 不在`,
    })
  }

  console.log(`\n=== Findings (mobile-create-buttons-iter465) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
