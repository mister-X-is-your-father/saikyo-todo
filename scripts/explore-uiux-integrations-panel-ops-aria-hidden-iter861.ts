/**
 * Phase 6.15 loop iter 861 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * integrations-panel.tsx の Source 操作 4 button visible text を aria-hidden span に統合 (一括)。
 *
 * 課題: src/components/integrations/integrations-panel.tsx の Source カード操作群 4 button
 *   1. Pull (条件付き 'Pull 中…' / 'Pull')
 *   2. 無効化 / 有効化 (toggle)
 *   3. 履歴 (Pull 履歴 disclosure)
 *   4. 作成 (条件付き '作成中…' / '作成'、Source 新規作成 submit)
 *   全 aria-label が完全 content (Source 名 + 操作) を含むのに visible に aria-hidden 無し。
 *
 * fix (1 ファイル 4 行差分):
 *   - 4 visible text を <span aria-hidden="true"> で wrap (うち 2 件は条件付き式)
 *
 * 検証: source-side regex assert + iter860/859/858/857/855/851 invariant cross-check。
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

  const checks: Array<[RegExp, string]> = [
    [
      /<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/,
      'Pull (条件付き)',
    ],
    [
      /<span aria-hidden="true">\{src\.enabled \? '無効化' : '有効化'\}<\/span>/,
      '無効化/有効化 toggle',
    ],
    [/<span aria-hidden="true">履歴<\/span>/, '履歴 disclosure'],
    [
      /<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/,
      '作成 (条件付き submit)',
    ],
  ]

  for (const [re, label] of checks) {
    if (re.test(ip)) {
      findings.push({ level: 'info', message: `integrations-panel "${label}" aria-hidden 統合 OK` })
    } else {
      findings.push({ level: 'warning', message: `integrations-panel "${label}" 未統合` })
    }
  }

  // iter860 invariant: templates-panel 作成 + 作成フォームへ
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

  // iter859 invariant: sprints-panel 4 件
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const cancelCount = (sp.match(/<span aria-hidden="true">キャンセル<\/span>/g) ?? []).length
  if (
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(sp) &&
    cancelCount === 2 &&
    /<span aria-hidden="true">編集<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: sprints-panel 4 件 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  // iter857 invariant: goals-panel
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">KR 追加<\/span>/.test(gp) &&
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: goals-panel KR + 作成フォームへ 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter851 invariant: skip-link
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

  console.log(`\n=== Findings (integrations-panel-ops-aria-hidden-iter861) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
