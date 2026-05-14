/**
 * Phase 6.15 loop iter 869 (mode-D Desktop a11y) —
 * integrations-panel Source Card 3 action button + Source create button + empty-state「作成フォームへ」
 * visible を aria-hidden span で wrap (5 callsite).
 *
 * 課題: src/components/integrations/integrations-panel.tsx:
 *   - Source Card Pull button (行 170): 動的 "Pull 中… / Pull"
 *   - Source Card 有効/無効 toggle (行 186): 動的 "無効化 / 有効化"
 *   - Source Card 履歴 toggle (行 207): visible "履歴"
 *   - Source create button (行 546): 動的 "作成中… / 作成"
 *   - empty-state「作成フォームへ」 (行 70): visible "作成フォームへ"
 * 各々 aria-label が完全 content (Source name + action + 補足) を含むのに、内側 visible は
 * aria-hidden 無し → SR ユーザに重複読み上げ。iter844-868 sweep の続編で 5 callsite 一括対応、
 * integrations-panel.tsx の SR 経路整合性向上。
 *
 * fix (1 ファイル ~5 行差分):
 *   - 各 visible label を <span aria-hidden="true"> で wrap
 *   - Play / Chevron / Trash icon の既存 aria-hidden 維持
 *
 * 検証: source-side regex assert + iter735-868 invariant cross-check。
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

  // 1. Pull button 動的 visible
  if (/<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-pull visible 動的 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src-pull visible aria-hidden 未統合`,
    })
  }

  // 2. toggle button 動的 visible
  if (/<span aria-hidden="true">\{src\.enabled \? '無効化' : '有効化'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-toggle visible 動的 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src-toggle visible aria-hidden 未統合`,
    })
  }

  // 3. 履歴 toggle visible
  if (/<span aria-hidden="true">履歴<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-imports-toggle visible "履歴" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src-imports-toggle visible aria-hidden 未統合`,
    })
  }

  // 4. Source create button 動的 visible
  if (/<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-create visible 動的 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src-create visible aria-hidden 未統合`,
    })
  }

  // 5. empty-state「作成フォームへ」
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `integrations-empty「作成フォームへ」 visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-empty「作成フォームへ」 visible aria-hidden 未統合`,
    })
  }

  // 6. aria-label 維持
  const ariaLabels = [
    /aria-label=\{[\s\S]+?`Source「\$\{src\.name\}」を手動 Pull \(sync 実行、30s timeout\)`/.test(
      ip,
    ),
    /aria-label="Source 作成フォームの『名前』入力欄にフォーカス"/.test(ip),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `integrations-panel aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel aria-label regression (${ariaLabels.filter(Boolean).length}/2)`,
    })
  }

  // 7. iter868 invariant: decompose-proposals 6 visible aria-hidden
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">中止<\/span>/.test(dp) &&
    /<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: decompose-proposals aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
  }

  // 8. iter735 invariant
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

  console.log(`\n=== Findings (integrations-panel-aria-hidden-iter869) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
