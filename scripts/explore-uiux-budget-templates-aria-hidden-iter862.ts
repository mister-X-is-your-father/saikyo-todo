/**
 * Phase 6.15 loop iter 862 (mode-D Desktop a11y) —
 * budget-panel + templates-panel: 4 button visible text を aria-hidden span で
 * wrap (一括、2 file)。
 *
 * 課題: 残り 4 button:
 *   1. budget-panel 「上限を変更」 button
 *      aria-label "AI 月次コスト上限と警告閾値の編集モードを開く"
 *   2. budget-panel 編集 form 「キャンセル」 button
 *      aria-label "AI 月次コスト上限の編集をキャンセル"
 *   3. budget-panel 編集 form 「保存」 Submit button
 *      aria-label "AI 月次コスト上限と警告閾値を保存"
 *   4. templates-panel EmptyState 「作成フォームへ」 button
 *      aria-label "Template 作成フォームの『名前』入力欄にフォーカス"
 *
 * fix (2 file ~4 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter800-861 sweep の続編
 *
 * 検証: source-side regex assert + iter735/860/861 invariant cross-check。
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
  const bpChecks: Array<[string, RegExp]> = [
    ['budget 上限を変更 button', /<span aria-hidden="true">上限を変更<\/span>/],
    ['budget edit form キャンセル', /<span aria-hidden="true">キャンセル<\/span>/],
    [
      'budget edit form 保存',
      /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/,
    ],
  ]
  for (const [label, re] of bpChecks) {
    if (re.test(bp)) {
      findings.push({ level: 'info', message: `${label} aria-hidden 統合 OK` })
    } else {
      findings.push({ level: 'warning', message: `${label} aria-hidden 未統合` })
    }
  }
  if (
    /aria-label="AI 月次コスト上限と警告閾値の編集モードを開く"/.test(bp) &&
    /aria-label="AI 月次コスト上限の編集をキャンセル"/.test(bp) &&
    /aria-label=\{[\s\S]+?'AI 月次コスト上限と警告閾値を保存'/.test(bp)
  ) {
    findings.push({ level: 'info', message: `budget 3 button aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `budget aria-label 破壊` })
  }

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates EmptyState 作成フォームへ aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates EmptyState 作成フォームへ aria-hidden 未統合`,
    })
  }
  if (/aria-label="Template 作成フォームの『名前』入力欄にフォーカス"/.test(tp)) {
    findings.push({ level: 'info', message: `templates EmptyState aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `templates EmptyState aria-label 破壊` })
  }

  // iter859 invariant: templates-panel Submit button (parallel agent's iter859)
  if (/<span aria-hidden="true">作成<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates Submit 作成 aria-hidden 維持 OK (iter859 parallel)`,
    })
  } else {
    findings.push({ level: 'warning', message: `templates Submit aria-hidden 破壊` })
  }

  // iter861 invariant: inbox-view EmptyState aria-hidden
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(iv)) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: inbox-view EmptyState aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (budget-templates-aria-hidden-iter862) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
