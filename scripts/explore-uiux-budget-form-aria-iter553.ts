/**
 * Phase 6.15 loop iter 553 (mode-D Desktop a11y) —
 * BudgetPanel <form> に aria-label + data-testid を補完。
 *
 * 課題: budget-panel.tsx の inline edit <form> は aria-busy のみで aria-label /
 *   data-testid 不在。他 form (sprints-panel sprint-edit / decompose-proposal edit /
 *   workflows / create-workspace 等) は aria-label="〜フォーム" + data-testid を持つが
 *   本 form のみ漏れ。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label="AI 月次コスト上限編集フォーム"
 *   - data-testid="budget-edit-form"
 *
 * iter552 (create-workspace) と同 pattern。+2 行差分、機能不変、視覚 layout 不変、
 * shadcn 編集なし、className / noValidate / iter312 (form 全体 aria-busy) /
 * iter524 (save Button aria-busy) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-552 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )

  // 1. form aria-label + data-testid
  if (
    /<form[\s\S]*?aria-label="AI 月次コスト上限編集フォーム"[\s\S]*?data-testid="budget-edit-form"/.test(
      bp,
    ) ||
    /<form[\s\S]*?data-testid="budget-edit-form"[\s\S]*?aria-label="AI 月次コスト上限編集フォーム"/.test(
      bp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `budget-panel.tsx: form aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: form aria-label / data-testid 不在`,
    })
  }

  // 2. iter312 (form 全体 aria-busy) 維持
  if (/<form[\s\S]+?aria-busy=\{update\.isPending \|\| undefined\}/.test(bp)) {
    findings.push({
      level: 'info',
      message: `budget-panel.tsx: iter312 form 全体 aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: iter312 invariant 破壊`,
    })
  }

  // 3. iter524 invariant: budget-save-btn aria-busy 維持
  if (
    /data-testid="budget-save-btn"[\s\S]{0,200}aria-busy=\{update\.isPending \|\| undefined\}/.test(
      bp,
    ) ||
    /aria-busy=\{update\.isPending \|\| undefined\}[\s\S]{0,200}data-testid="budget-save-btn"/.test(
      bp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter524 invariant: budget-save-btn aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter524 invariant: 破壊`,
    })
  }

  // 4. iter552 invariant: create-workspace-form aria-label 維持
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    /aria-label="Workspace 作成フォーム"/.test(cwf) &&
    /data-testid="create-workspace-form"/.test(cwf)
  ) {
    findings.push({
      level: 'info',
      message: `iter552 invariant: create-workspace-form aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter552 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (budget-form-aria-iter553) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
