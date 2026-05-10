/**
 * Phase 6.15 loop iter 876 (mode-D Desktop a11y) —
 * decompose-proposals-panel agent-cancel + proposals-redecompose button: visible
 * text を span aria-hidden で wrap + redecompose は WCAG 2.5.3 (Label in Name)
 * 違反を修正。
 *
 * 課題: src/components/workspace/decompose-proposals-panel.tsx:
 *   - agent-cancel (visible "中止") aria-label "実行中の Agent を中止 (...)" 適合だったが
 *     iter844-875 campaign 規約 (visible aria-hidden 単独経路) から外れていた。
 *   - proposals-redecompose (visible "追加分解" / "再分解") 旧 aria-label "既存の保留中 N 件を
 *     残して追加で AI 分解" / "AI 分解を再実行" は visible "追加分解" / "再分解" を substring に
 *     含まず WCAG 2.5.3 違反 (`追加で AI 分解` と `追加分解` の token 配置乖離)。
 *
 * fix (1 ファイル / +5-3 行差分、2 button 一括):
 *   - agent-cancel: <Button>中止</Button> → <Button><span aria-hidden="true">中止</span></Button>
 *   - redecompose aria-label を `追加分解 (...)` / `再分解 (AI 分解を再実行)` 形に変更し visible prefix
 *   - redecompose visible 切替を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter873/874/875 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. agent-cancel visible "中止" span aria-hidden
  if (/data-testid="agent-cancel"[\s\S]+?<span aria-hidden="true">中止<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `agent-cancel visible "中止" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `agent-cancel visible "中止" aria-hidden 未統合`,
    })
  }

  // 2. redecompose normal-with-list aria-label に visible "追加分解" prefix
  if (/`追加分解 \(既存の保留中 \$\{list\.length\} 件を残して AI 分解を再実行\)`/.test(dp)) {
    findings.push({
      level: 'info',
      message: `redecompose with-list aria-label に "追加分解" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `redecompose with-list aria-label に "追加分解" prefix 不含`,
    })
  }

  // 3. redecompose normal-empty aria-label に visible "再分解" prefix
  if (/`再分解 \(AI 分解を再実行\)`/.test(dp)) {
    findings.push({
      level: 'info',
      message: `redecompose empty aria-label に "再分解" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `redecompose empty aria-label に "再分解" prefix 不含`,
    })
  }

  // 4. redecompose visible 切替 span aria-hidden
  if (/<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `redecompose visible 切替 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `redecompose visible 切替 aria-hidden 未統合`,
    })
  }

  // 5. 旧 aria-label "AI 分解を再実行" 単独形 削除
  if (!/aria-label=\{[\s\S]*'AI 分解を再実行'[\s\S]*\}/.test(dp)) {
    findings.push({
      level: 'info',
      message: `redecompose 旧 aria-label "AI 分解を再実行" 単独形削除 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `redecompose 旧 aria-label "AI 分解を再実行" 単独形 残存`,
    })
  }

  // iter875 invariant: today-empty-quick-add aria-label
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (/aria-label="クイック追加にフォーカス \(キー: q、入力欄にスクロール\+focus\)"/.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter875 invariant: today-empty-quick-add aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter875 invariant: today-empty-quick-add 破壊` })
  }

  console.log(`\n=== Findings (decompose-cancel-redecompose-iter876) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
