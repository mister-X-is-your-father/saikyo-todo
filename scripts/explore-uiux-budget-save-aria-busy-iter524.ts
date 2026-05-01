/**
 * Phase 6.15 loop iter 524 (mode-D Desktop a11y) —
 * BudgetPanel save Button に aria-busy を補完
 * (iter521-523 form aria-busy pattern を inline edit form の save button に展開)。
 *
 * 課題: budget-panel.tsx 行 257-270 の save Button は disabled + aria-label 動的
 *   付与済だが aria-busy 不在。form 全体は aria-busy={update.isPending || undefined}
 *   を持つが、Button 単体での aria-busy が無いと SR は disabled (= 禁止) と
 *   pending (= 処理中) を区別できない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - save Button に aria-busy={update.isPending || undefined}
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、disabled / type=submit /
 * aria-label / data-testid 維持、iter312 (form 全体 aria-busy + form 化) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-523 invariant cross-check。
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

  // 1. budget-save-btn aria-busy
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
      message: `budget-panel.tsx: budget-save-btn aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: budget-save-btn aria-busy 不在`,
    })
  }

  // 2. 既存 aria-label / data-testid / disabled 維持
  if (
    /data-testid="budget-save-btn"/.test(bp) &&
    /aria-label=\{[\s\S]+?'AI 月次コスト上限を保存中…'[\s\S]+?'AI 月次コスト上限と警告閾値を保存'/.test(
      bp,
    ) &&
    /disabled=\{update\.isPending\}/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `budget-panel.tsx: budget-save-btn 既存 aria-label / data-testid / disabled 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: budget-save-btn 既存属性破壊`,
    })
  }

  // 3. iter312 (form 全体 aria-busy) 維持
  if (/<form[\s\S]+?aria-busy=\{update\.isPending \|\| undefined\}/.test(bp)) {
    findings.push({
      level: 'info',
      message: `budget-panel.tsx: iter312 form 全体 aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: iter312 form 全体 aria-busy 破壊`,
    })
  }

  // 4. iter515-523 invariant cross-check
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok516 = /aria-label=\{\s*runsOpen\s*\?\s*`Workflow「\$\{wf\.name\}」の実行履歴/.test(wp)
  const ok517 = /aria-label=\{\s*open\s*\?\s*`「\$\{label\}」の差分/.test(al)
  const ok523 = /id="editSprint"[\s\S]*?aria-busy=\{assignSprint\.isPending \|\| undefined\}/.test(
    ied,
  )
  if (ok515 && ok516 && ok517 && ok523) {
    findings.push({
      level: 'info',
      message: `iter515-523 invariant: 重要 anchor 4 件維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-523 invariant: 破壊 (515=${ok515} 516=${ok516} 517=${ok517} 523=${ok523})`,
    })
  }

  console.log(`\n=== Findings (budget-save-aria-busy-iter524) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
