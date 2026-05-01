/**
 * Phase 6.15 loop iter 554 (mode-D Desktop a11y) —
 * WorkflowsPanel create-workflow-form <form> に aria-label + data-testid を補完。
 *
 * 課題: workflows-panel.tsx 行 91-98 の Workflow 作成 <form> は aria-busy のみで
 *   aria-label / data-testid 不在。他 form (goals / templates / sprints / budget /
 *   create-workspace 等) は aria-label="〜フォーム" + data-testid を持つが本 form のみ漏れ。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label="Workflow 作成フォーム"
 *   - data-testid="create-workflow-form"
 *
 * iter552 (create-workspace) / iter553 (budget-edit) と同 pattern を WorkflowsPanel に展開。
 * +2 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、className / noValidate /
 * onSubmit / iter319 (form 全体 aria-busy) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-553 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. create-workflow-form aria-label + data-testid
  if (
    /aria-label="Workflow 作成フォーム"[\s\S]{0,200}data-testid="create-workflow-form"/.test(wp) ||
    /data-testid="create-workflow-form"[\s\S]{0,200}aria-label="Workflow 作成フォーム"/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: create-workflow-form aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: create-workflow-form aria-label / data-testid 不在`,
    })
  }

  // 2. iter553 invariant: budget-form aria-label 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label="AI 月次コスト上限編集フォーム"/.test(bp) &&
    /data-testid="budget-edit-form"/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `iter553 invariant: budget-form aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter553 invariant: 破壊`,
    })
  }

  // 3. iter552 invariant: create-workspace-form aria-label 維持
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

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (create-workflow-form-aria-iter554) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
