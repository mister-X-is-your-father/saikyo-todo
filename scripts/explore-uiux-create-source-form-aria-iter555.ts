/**
 * Phase 6.15 loop iter 555 (mode-D Desktop a11y) —
 * IntegrationsPanel create-source-form <form> に aria-label を補完。
 *
 * 課題: integrations-panel.tsx 行 305-316 の <form> は data-testid="create-source-form" +
 *   aria-busy + onSubmit はあるが aria-label 不在。他 form (goals / templates / sprints /
 *   budget / create-workspace / workflows) は aria-label="〜フォーム" を持つが本 form のみ漏れ。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label="External Source 作成フォーム"
 *
 * iter552 (create-workspace) / iter553 (budget-edit) / iter554 (workflow) と同 pattern を
 * 完成。+1 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、className / noValidate /
 * onSubmit / aria-busy / data-testid invariant 維持。
 *
 * 検証: source-side regex assert + iter515-554 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. create-source-form aria-label
  if (
    /<form[\s\S]{0,500}aria-label="External Source 作成フォーム"[\s\S]{0,500}data-testid="create-source-form"/.test(
      ip,
    ) ||
    /<form[\s\S]{0,500}data-testid="create-source-form"[\s\S]{0,500}aria-label="External Source 作成フォーム"/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `integrations-panel.tsx: create-source-form aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel.tsx: create-source-form aria-label 不在`,
    })
  }

  // 2. iter515 anchor invariant
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 履歴 toggle aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  // 3. iter554 invariant: workflow create form aria-label 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/aria-label="Workflow 作成フォーム"/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter554 invariant: workflow create form aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter554 invariant: 破壊`,
    })
  }

  // 4. iter553 invariant: budget-edit form aria-label 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/aria-label="AI 月次コスト上限編集フォーム"/.test(bp)) {
    findings.push({
      level: 'info',
      message: `iter553 invariant: budget-edit form aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter553 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (create-source-form-aria-iter555) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
