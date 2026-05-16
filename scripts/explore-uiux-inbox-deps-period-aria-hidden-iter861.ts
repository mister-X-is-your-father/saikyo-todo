/**
 * Phase 6.15 loop iter 861 (mode-D Desktop a11y) —
 * inbox-view + item-dependencies-panel + personal-period-view: 5 button
 * visible text を aria-hidden span で wrap (一括、3 file)。
 *
 * 課題: 3 component に visible-text-only の重複読み上げ箇所が 5 種残っていた:
 *   1. inbox-view: EmptyState 「クイック追加にフォーカス (キー: q)」 button
 *      aria-label "クイック追加入力欄にフォーカス (q キーでも可)"
 *   2. item-dependencies-panel: 追加 button (依存追加)
 *      aria-label "選択した Item を依存先として追加"
 *   3. item-dependencies-panel: 解除 button (依存解除、各 dep row)
 *      aria-label `依存「${title}」を解除`
 *   4. personal-period-view: ゴール保存 button (period 別)
 *      aria-label `${period}ゴールを保存`
 *   5. personal-period-view: item title button (各 row)
 *      aria-label `「${title}」を編集`
 *
 * fix (3 file ~5 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter800-860 sweep の続編
 *
 * 検証: source-side regex assert + iter735/859/860 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(iv)) {
    findings.push({
      level: 'info',
      message: `inbox-view EmptyState button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `inbox-view EmptyState aria-hidden 未統合` })
  }
  if (/aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/.test(iv)) {
    findings.push({ level: 'info', message: `inbox-view aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `inbox-view aria-label 破壊` })
  }

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `item-dependencies 追加 button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-dependencies 追加 aria-hidden 未統合` })
  }
  if (/<span aria-hidden="true">解除<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `item-dependencies 解除 button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-dependencies 解除 aria-hidden 未統合` })
  }
  if (
    /aria-label=\{[\s\S]+?'選択した Item を依存先として追加'/.test(dp) &&
    /aria-label=\{[\s\S]+?`依存「\$\{ref\.title\}」を解除`/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `item-dependencies aria-label (追加 + 解除) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-dependencies aria-label 破壊` })
  }

  const pp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{upsertGoal\.isPending \? '保存中…' : 'ゴール保存'\}<\/span>/.test(
      pp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `personal-period ゴール保存 button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `personal-period ゴール保存 aria-hidden 未統合` })
  }
  if (/<span aria-hidden="true">\{it\.title\}<\/span>/.test(pp)) {
    findings.push({
      level: 'info',
      message: `personal-period item title button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `personal-period item title aria-hidden 未統合` })
  }
  if (
    /aria-label=\{[\s\S]+?`\$\{periodLabelJa\(period\)\}ゴールを保存`/.test(pp) &&
    /aria-label=\{`「\$\{it\.title\}」を編集`\}/.test(pp)
  ) {
    findings.push({
      level: 'info',
      message: `personal-period aria-label (ゴール保存 + item title) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `personal-period aria-label 破壊` })
  }

  // iter860 invariant: comment-thread 投稿 button aria-hidden
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '送信中…' : '投稿'\}<\/span>/.test(ct)) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: comment-thread 投稿 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
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

  console.log(`\n=== Findings (inbox-deps-period-aria-hidden-iter861) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
