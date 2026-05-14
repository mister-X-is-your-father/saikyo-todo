/**
 * Phase 6.15 loop iter 861 (mode-D Desktop a11y) —
 * sprints-panel 期間編集 form 2 button + empty-state「作成フォームへ」 button visible text を
 * aria-hidden span で wrap (3 callsite).
 *
 * 課題: src/components/workspace/sprints-panel.tsx の
 *   - 期間編集 cancel button (行 665-679): visible "キャンセル", aria-label "Sprint「{name}」の期間編集をキャンセル"
 *   - 期間編集 save button (行 680-694): visible "{isPending ? '保存中…' : '保存'}", aria-label 動的 2 state
 *   - empty-state「作成フォームへ」 button (行 347-358): visible "作成フォームへ", aria-label "Sprint 作成フォームの『名前』入力欄にフォーカス"
 * いずれも aria-label が完全 content を含むのに、内側 visible text は aria-hidden 無し → SR ユーザに重複読み上げ。
 * iter844-860 sweep の続編で 3 callsite 一括対応、sprints-panel.tsx 内 button (iter858 action 7 件
 * + iter836 sprint create + iter837 sprint default + iter861 period 2 + empty 1) で a11y 規約完成。
 *
 * fix (1 ファイル ~3 行差分):
 *   - 期間編集 cancel "キャンセル" を <span aria-hidden="true"> で wrap
 *   - 期間編集 save "{isPending ? '保存中…' : '保存'}" を <span aria-hidden="true"> で wrap
 *   - empty「作成フォームへ」 を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、button 機能不変、visual layout 不変
 *
 * 検証: source-side regex assert + iter735-860 invariant cross-check。
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

  // 1. 期間編集 cancel visible "キャンセル" aria-hidden span
  if (/<span aria-hidden="true">キャンセル<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-period-cancel visible "キャンセル" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-period-cancel visible "キャンセル" aria-hidden 未統合`,
    })
  }

  // 2. 期間編集 save visible 動的 "保存中… / 保存" aria-hidden span
  if (/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-period-save visible (動的 2 state) aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-period-save visible aria-hidden 未統合`,
    })
  }

  // 3. empty-state visible "作成フォームへ" aria-hidden span
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-empty「作成フォームへ」 visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-empty「作成フォームへ」 visible aria-hidden 未統合`,
    })
  }

  // 4. 該当 button aria-label 維持 (3 件)
  const ariaLabels = [
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集をキャンセル`/.test(sp),
    /aria-label=\{[\s\S]+?`Sprint「\$\{sprint\.name\}」の期間を保存`/.test(sp),
    /aria-label="Sprint 作成フォームの『名前』入力欄にフォーカス"/.test(sp),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `sprint 3 button aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint button aria-label regression (${ariaLabels.filter(Boolean).length}/3)`,
    })
  }

  // 5. iter860 invariant: goal-kr-add + empty 作成フォームへ (goals-panel) 維持
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
      message: `iter860 invariant: goal-kr-add + empty aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
  }

  // 6. iter858 invariant: sprint-card action 5 静的 aria-hidden 維持
  const sprintActionTags = ['期間', '稼働開始', '完了', '計画に戻す', '中止']
  const allPresent = sprintActionTags.every((lbl) =>
    new RegExp(`<span aria-hidden="true">${lbl}</span>`).test(sp),
  )
  if (allPresent) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: sprint-card 5 静的 action aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // 7. iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (sprint-period-edit-empty-aria-hidden-iter861) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
