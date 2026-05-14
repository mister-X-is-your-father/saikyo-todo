/**
 * Phase 6.15 loop iter 868 (mode-D Desktop a11y) —
 * decompose-proposals-panel 内 残 visible 6 spot (中止 / 追加分解-再分解 / 編集キャンセル /
 * 編集保存 / proposal title / proposal description) を aria-hidden span で wrap.
 *
 * 課題: src/components/workspace/decompose-proposals-panel.tsx:
 *   - bulk 操作行 中止 button (行 186): visible "中止" aria-hidden 無し
 *   - 再分解 button (行 252): 動的 "追加分解 / 再分解" aria-hidden 無し
 *   - proposal row 編集キャンセル (行 489): visible "キャンセル" aria-hidden 無し
 *   - proposal row 編集保存 (行 505): 動的 "保存中… / 保存" aria-hidden 無し
 *   - proposal row title (行 527): visible {proposal.title} aria-hidden 無し (button aria-label に含む)
 *   - proposal row description (行 530): visible <p>{description}</p> aria-hidden 無し (button aria-label 内には別途要素)
 * 各々 親 button aria-label が完全 content を持つのに、内側 visible は aria-hidden 無し → SR ユーザに重複読み上げ。
 * iter844-867 sweep の続編で 6 callsite 一括対応、AI 分解提案 panel の SR 経路整合性向上。
 *
 * fix (1 ファイル ~7 行差分、6 callsite):
 *   - 各 visible label を <span aria-hidden="true"> で wrap (または既存 <span>/<p> に attr 追加)
 *   - 既存 aria-label / data-testid / MustBadge 維持
 *
 * 検証: source-side regex assert + iter735-867 invariant cross-check。
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

  // 1. 中止 button visible aria-hidden span
  if (/<span aria-hidden="true">中止<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `agent-cancel visible "中止" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `agent-cancel visible aria-hidden 未統合`,
    })
  }

  // 2. 再分解 button 動的 visible aria-hidden span
  if (/<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `proposals-redecompose 動的 visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `proposals-redecompose 動的 visible aria-hidden 未統合`,
    })
  }

  // 3. 編集キャンセル visible "キャンセル" aria-hidden span
  if ((dp.match(/<span aria-hidden="true">キャンセル<\/span>/g) ?? []).length >= 1) {
    findings.push({
      level: 'info',
      message: `proposal edit cancel visible "キャンセル" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `proposal edit cancel visible aria-hidden 未統合`,
    })
  }

  // 4. 編集保存 動的 visible aria-hidden span
  if (/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `proposal edit save 動的 visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `proposal edit save 動的 visible aria-hidden 未統合`,
    })
  }

  // 5. proposal title <span aria-hidden> 追加
  if (
    /<span className="truncate font-medium" aria-hidden="true">\n\s+\{proposal\.title\}/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `proposal title visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `proposal title visible aria-hidden 未統合`,
    })
  }

  // 6. proposal description <p aria-hidden> 追加
  if (
    /<p className="text-muted-foreground mt-0\.5 line-clamp-2 text-xs" aria-hidden="true">\n\s+\{proposal\.description\}/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `proposal description visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `proposal description visible aria-hidden 未統合`,
    })
  }

  // 7. 主要 aria-label 維持
  const ariaLabels = [
    /aria-label=\{[\s\S]+?'実行中の Agent を中止 \(Researcher \/ 分解処理を停止\)'/.test(dp),
    /aria-label=\{`提案「\$\{proposal\.title\}」を編集\$\{proposal\.isMust \? ' \(MUST\)' : ''\}`\}/.test(
      dp,
    ),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `decompose-proposals aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals aria-label regression (${ariaLabels.filter(Boolean).length}/2)`,
    })
  }

  // 8. iter867 invariant: workflow card 4 visible aria-hidden 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">編集<\/span>/.test(wp) &&
    /<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: workflow card aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: 破壊` })
  }

  // 9. iter735 invariant
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

  console.log(`\n=== Findings (decompose-proposals-aria-hidden-iter868) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
