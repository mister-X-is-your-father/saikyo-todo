/**
 * Phase 6.15 loop iter 874 (mode-D Desktop a11y) —
 * 5 component (goals / sprints / integrations / workflows / time-entries) の
 * empty-state CTA「作成フォームへ」 button: WCAG 2.5.3 (Label in Name) 違反を一括修正
 * + visible "作成フォームへ" を span aria-hidden で wrap (campaign 横断)。
 *
 * 課題: iter873 で発見した templates-panel の templates-empty-create と同じく、
 *   visible "作成フォームへ" の `へ` が旧 aria-label "作成フォームの ..." の `の` に
 *   置換される pattern が共通 button design として 5 component に分散していた:
 *   - goals-panel goals-empty-create
 *   - sprints-panel sprints-empty-create
 *   - integrations-panel integrations-empty-create
 *   - workflows-panel workflows-empty-create
 *   - time-entries-panel time-entries-empty-create
 *   いずれも音声「作成フォームへ」が hit せず WCAG 2.5.3 違反 (5 surface 横断)。
 *
 * fix (5 ファイル / 各 +2-2 行差分):
 *   - aria-label を `{Entity} 作成フォームへ移動 (『{Field}』入力欄にフォーカス)` 形に統一
 *   - visible "作成フォームへ" を <span aria-hidden="true"> で wrap
 *   - data-testid / onClick (focus + scrollIntoView) は維持
 *
 * 検証: source-side regex assert + iter872/873 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  type Spec = { path: string; entity: string; field: string; testId: string }
  const specs: readonly Spec[] = [
    {
      path: 'src/components/workspace/goals-panel.tsx',
      entity: 'Goal',
      field: 'Objective',
      testId: 'goals-empty-create',
    },
    {
      path: 'src/components/workspace/sprints-panel.tsx',
      entity: 'Sprint',
      field: '名前',
      testId: 'sprints-empty-create',
    },
    {
      path: 'src/components/integrations/integrations-panel.tsx',
      entity: 'Source',
      field: '名前',
      testId: 'integrations-empty-create',
    },
    {
      path: 'src/components/workflow/workflows-panel.tsx',
      entity: 'Workflow',
      field: '名前',
      testId: 'workflows-empty-create',
    },
    {
      path: 'src/components/time-entry/time-entries-panel.tsx',
      entity: '稼働記録',
      field: '勤務日',
      testId: 'time-entries-empty-create',
    },
  ]

  for (const sp of specs) {
    const src = readFileSync(resolve(process.cwd(), sp.path), 'utf8')
    // 1. aria-label に "作成フォームへ移動" (新 prefix) 含む
    const newLabelRe = new RegExp(
      `aria-label="${sp.entity} 作成フォームへ移動 \\(『${sp.field}』入力欄にフォーカス\\)"`,
    )
    if (newLabelRe.test(src)) {
      findings.push({
        level: 'info',
        message: `${sp.testId}: aria-label に visible "作成フォームへ" prefix 含む OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${sp.testId}: aria-label に visible "作成フォームへ" prefix 不含`,
      })
    }
    // 2. 旧 aria-label "作成フォームの ..." 削除
    const oldLabelRe = new RegExp(
      `aria-label="${sp.entity} 作成フォームの『${sp.field}』入力欄にフォーカス"`,
    )
    if (!oldLabelRe.test(src)) {
      findings.push({
        level: 'info',
        message: `${sp.testId}: 旧 aria-label "作成フォームの..." 削除済 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${sp.testId}: 旧 aria-label "作成フォームの..." 残存`,
      })
    }
    // 3. visible "作成フォームへ" span aria-hidden
    const wrapRe = new RegExp(
      `data-testid="${sp.testId}"[\\s\\S]+?<span aria-hidden="true">作成フォームへ</span>`,
    )
    if (wrapRe.test(src)) {
      findings.push({
        level: 'info',
        message: `${sp.testId}: visible "作成フォームへ" span aria-hidden 統合 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${sp.testId}: visible "作成フォームへ" aria-hidden 未統合`,
      })
    }
  }

  // iter873 invariant: templates-empty-create
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/aria-label="Template 作成フォームへ移動 \(『名前』入力欄にフォーカス\)"/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: templates-empty-create aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: templates-empty-create 破壊` })
  }

  console.log(`\n=== Findings (empty-cta-label-in-name-batch-iter874) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
