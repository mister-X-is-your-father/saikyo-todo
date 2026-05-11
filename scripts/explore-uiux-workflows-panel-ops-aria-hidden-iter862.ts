/**
 * Phase 6.15 loop iter 862 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * workflows-panel.tsx の Workflow 操作 4 button visible text を aria-hidden span に統合 (一括)。
 *
 * 課題: src/components/workflow/workflows-panel.tsx の Workflow カード操作群:
 *   1. 「作成フォームへ」 raw button (EmptyState focus jump)
 *   2. 「編集」 (graph / trigger 編集 dialog open)
 *   3. 「無効化 / 有効化」 (toggle、aria-label 完全 content)
 *   4. 「履歴」 (実行履歴 disclosure)
 *   全 aria-label が完全 content を含むのに visible に aria-hidden 無し → SR 再 announce。
 *   既存の「実行」 button (line 338) と 「作成」 (line 175) は span 済、合計で workflow panel
 *   主要 6 button が span 化される。
 *
 * fix (1 ファイル 4 行差分):
 *   - 4 visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter861/860/859/857/851 invariant cross-check。
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

  const checks: Array<[RegExp, string]> = [
    [/<span aria-hidden="true">作成フォームへ<\/span>/, '作成フォームへ (EmptyState)'],
    [/<span aria-hidden="true">編集<\/span>/, '編集 (graph / trigger)'],
    [
      /<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/,
      '無効化/有効化 toggle',
    ],
    [/<span aria-hidden="true">履歴<\/span>/, '履歴 disclosure'],
  ]

  for (const [re, label] of checks) {
    if (re.test(wp)) {
      findings.push({ level: 'info', message: `workflows-panel "${label}" aria-hidden 統合 OK` })
    } else {
      findings.push({ level: 'warning', message: `workflows-panel "${label}" 未統合` })
    }
  }

  // 既存 invariant: 実行 (iter pre-existing) + 作成
  if (
    /<span aria-hidden="true">\{trigger\.isPending \? '実行中…' : '実行'\}<\/span>/.test(wp) &&
    /<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel 既存 span 「実行」「作成」 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `workflows-panel 既存 span 破壊` })
  }

  // iter861 invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(ip) &&
    /<span aria-hidden="true">履歴<\/span>/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: integrations-panel Pull + 履歴 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
  }

  // iter860 invariant: templates-panel
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{createMut\.isPending \? '作成中…' : '作成'\}<\/span>/.test(tp) &&
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: templates-panel 2 件 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
  }

  // iter857 invariant
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">KR 追加<\/span>/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: goals-panel KR 追加 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (workflows-panel-ops-aria-hidden-iter862) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
