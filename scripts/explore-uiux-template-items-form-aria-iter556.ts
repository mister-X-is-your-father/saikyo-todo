/**
 * Phase 6.15 loop iter 556 (mode-D Desktop a11y) —
 * TemplateItemsEditor 子 Item 追加 <form> に aria-label + data-testid を補完。
 *
 * 課題: template-items-editor.tsx の <form> は aria-busy のみで aria-label / data-testid 不在。
 *   他 form (goals / sprints / budget / create-workspace / workflow / source 等) は
 *   aria-label="〜フォーム" + data-testid を持つが本 form のみ漏れ。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label="Template 子 Item 追加フォーム"
 *   - data-testid="template-items-add-form"
 *
 * iter552-555 form aria-label sweep を template-items-editor に展開、6 form 統一達成。
 * +2 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、className / noValidate /
 * onSubmit / aria-busy invariant 維持。
 *
 * 検証: source-side regex assert + iter515-555 invariant cross-check。
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

  // 1. template-items-add-form aria-label + data-testid
  if (
    /aria-label="Template 子 Item 追加フォーム"[\s\S]{0,200}data-testid="template-items-add-form"/.test(
      tie,
    ) ||
    /data-testid="template-items-add-form"[\s\S]{0,200}aria-label="Template 子 Item 追加フォーム"/.test(
      tie,
    )
  ) {
    findings.push({
      level: 'info',
      message: `template-items-editor.tsx: form aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor.tsx: form aria-label / data-testid 不在`,
    })
  }

  // 2. iter555 invariant: source-create form aria-label 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label="External Source 作成フォーム"/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter555 invariant: source-create form aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter555 invariant: 破壊`,
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

  // 4. iter515 anchor invariant
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

  console.log(`\n=== Findings (template-items-form-aria-iter556) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
