/**
 * Phase 6.15 loop iter 859 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * sprints-panel.tsx の残 4 button (period 編集 cancel/save / defaults edit / EmptyState focus jump)
 * visible text を aria-hidden span に統合。
 *
 * 課題: iter858 で Sprint 操作 7 button を span 化したが、同 file 内に他にも残存:
 *   - line 358 EmptyState focus jump button「作成フォームへ」
 *   - line 678 Sprint 期間編集「キャンセル」 Button
 *   - line 693 Sprint 期間編集「保存中…」/「保存」 Button (条件付き)
 *   - line 922 Sprint デフォルト「編集」 Button (edit-mode open)
 *
 * fix (1 ファイル 4 箇所差分):
 *   - 4 visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter858 7 件 invariant + iter857/856/855/851 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 4 件 fix の regex
  const fixes: Array<[RegExp, string]> = [
    [/<span aria-hidden="true">作成フォームへ<\/span>/, '作成フォームへ (EmptyState)'],
    [/<span aria-hidden="true">キャンセル<\/span>/g, 'キャンセル (period 編集 + defaults)'],
    [
      /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/,
      '保存 (period 編集、update)',
    ],
    [/<span aria-hidden="true">編集<\/span>/, '編集 (defaults edit-mode open)'],
  ]

  for (const [re, label] of fixes) {
    if (re.test(sp)) {
      findings.push({ level: 'info', message: `sprints-panel "${label}" aria-hidden 統合 OK` })
    } else {
      findings.push({ level: 'warning', message: `sprints-panel "${label}" 未統合` })
    }
  }

  // キャンセル は 2 箇所あるはず (period + defaults)
  const cancelCount = (sp.match(/<span aria-hidden="true">キャンセル<\/span>/g) ?? []).length
  if (cancelCount === 2) {
    findings.push({
      level: 'info',
      message: `sprints-panel キャンセル aria-hidden span 計 2 件 (period + defaults) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel キャンセル span 件数 ${cancelCount} (期待 2)`,
    })
  }

  // iter858 invariant: Sprint 操作 7 件
  const ops7 = [
    /<span aria-hidden="true">期間<\/span>/,
    /<span aria-hidden="true">稼働開始<\/span>/,
    /<span aria-hidden="true">完了<\/span>/,
    /<span aria-hidden="true">計画に戻す<\/span>/,
    /<span aria-hidden="true">中止<\/span>/,
    /<span aria-hidden="true">\{retroPending \? '振り返り生成中…' : '振り返り生成'\}<\/span>/,
    /<span aria-hidden="true">\s*\{premortemPending\s*\?\s*'Pre-mortem 生成中…'/,
  ]
  const allOps = ops7.every((r) => r.test(sp))
  if (allOps) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: Sprint 操作 7 件 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter857 invariant: goals-panel KR + 作成フォームへ
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

  console.log(`\n=== Findings (sprints-panel-form-and-empty-aria-hidden-iter859) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
