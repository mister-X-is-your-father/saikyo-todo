/**
 * Phase 6.15 loop iter 875 (mode-D Desktop a11y) —
 * 3 view (today / inbox / board) の empty-state CTA「クイック追加にフォーカス (キー: q)」
 * button: WCAG 2.5.3 (Label in Name) 違反を一括修正 + visible を span aria-hidden で wrap。
 *
 * 課題: visible "クイック追加にフォーカス (キー: q)" に対し、旧 aria-label
 *   "クイック追加入力欄にフォーカス (q キーでも可)" は 2 箇所で乖離:
 *   - 「クイック追加」と「フォーカス」の間に visible は何も無いが aria-label は「入力欄」を挿入
 *   - 「(キー: q)」 vs 「(q キーでも可)」 で順序と文言が異なる
 *   結果: 音声「クイック追加にフォーカス」が aria-label substring 不適合で 3 view 横断 hit せず
 *   WCAG 2.5.3 違反 (iter873/874 の「作成フォームへ」 pattern と同類の 3 surface 横断問題)。
 *
 * fix (3 ファイル / 各 +2-2 行差分、計 +6-6 行):
 *   - aria-label を `クイック追加にフォーカス (キー: q、入力欄にスクロール+focus)` 形に統一し
 *     visible "クイック追加にフォーカス (キー: q)" を prefix substring に
 *   - visible 全体を <span aria-hidden="true"> で wrap
 *   - aria-keyshortcuts="q" / data-testid / onClick (focus + scrollIntoView) は維持
 *
 * 検証: source-side regex assert + iter873/874 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  type Spec = { path: string; testId: string }
  const specs: readonly Spec[] = [
    { path: 'src/components/workspace/today-view.tsx', testId: 'today-empty-quick-add' },
    { path: 'src/components/workspace/inbox-view.tsx', testId: 'inbox-empty-quick-add' },
    { path: 'src/components/workspace/items-board.tsx', testId: 'board-empty-quick-add' },
  ]

  for (const sp of specs) {
    const src = readFileSync(resolve(process.cwd(), sp.path), 'utf8')

    // 1. 新 aria-label に visible "クイック追加にフォーカス (キー: q)" prefix
    const newLabelRe =
      /aria-label="クイック追加にフォーカス \(キー: q、入力欄にスクロール\+focus\)"/
    if (newLabelRe.test(src)) {
      findings.push({
        level: 'info',
        message: `${sp.testId}: 新 aria-label に visible prefix 含む OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${sp.testId}: 新 aria-label が visible prefix 不含`,
      })
    }

    // 2. 旧 aria-label "クイック追加入力欄にフォーカス" 削除
    const oldLabelRe = /aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/
    if (!oldLabelRe.test(src)) {
      findings.push({
        level: 'info',
        message: `${sp.testId}: 旧 aria-label 削除済 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${sp.testId}: 旧 aria-label "入力欄にフォーカス" 残存`,
      })
    }

    // 3. visible span aria-hidden
    if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(src)) {
      findings.push({
        level: 'info',
        message: `${sp.testId}: visible span aria-hidden 統合 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${sp.testId}: visible aria-hidden 未統合`,
      })
    }
  }

  // iter874 invariant: 5 component empty CTA "作成フォームへ"
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/aria-label="Goal 作成フォームへ移動 \(『Objective』入力欄にフォーカス\)"/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: goals-empty-create aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: goals-empty-create 破壊` })
  }

  console.log(`\n=== Findings (quick-add-empty-cta-batch-iter875) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
