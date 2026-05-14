/**
 * Phase 6.15 loop iter 860 (mode-D Desktop a11y) —
 * goals-panel KR 追加 button + empty state「作成フォームへ」 button visible text を
 * aria-hidden span で wrap (2 callsite).
 *
 * 課題: src/components/workspace/goals-panel.tsx の
 *   - KR 追加 button (行 859-862): visible "KR 追加" は Plus icon と並ぶが aria-hidden 無し
 *   - empty-state「作成フォームへ」 button (行 290-302): visible "作成フォームへ" は aria-hidden 無し
 * 両 button とも aria-label が完全 content (KR 追加 4 state / Goal 作成 form focus 指示) を
 * 含むのに、内側 visible text は aria-hidden 無し → SR ユーザに重複読み上げ。
 * iter844-859 sweep の続編で 2 callsite 一括対応。
 *
 * fix (1 ファイル ~2 行差分):
 *   - KR 追加 button "KR 追加" を <span aria-hidden="true"> で wrap
 *   - empty-state 「作成フォームへ」 を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、button 機能不変、visual layout 不変
 *
 * 検証: source-side regex assert + iter735-859 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. "KR 追加" visible aria-hidden span
  if (/<span aria-hidden="true">KR 追加<\/span>/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goal-kr-add visible span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-kr-add visible aria-hidden 未統合`,
    })
  }

  // 2. "作成フォームへ" visible aria-hidden span (empty state)
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goal-empty 作成フォームへ visible span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-empty 作成フォームへ visible aria-hidden 未統合`,
    })
  }

  // 3. KR 追加 button aria-label 維持 (4 state)
  if (
    /aria-label=\{[\s\S]+?'Key Result を追加するにはタイトルを入力してください'[\s\S]+?'Key Result を追加中…'[\s\S]+?'Key Result をこの Goal に追加'/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goal-kr-add aria-label 4 state 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-kr-add aria-label regression`,
    })
  }

  // 4. empty-state button aria-label 維持
  if (/aria-label="Goal 作成フォームの『Objective』入力欄にフォーカス"/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goal-empty button aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-empty button aria-label regression`,
    })
  }

  // 5. iter859 invariant: goal-status 5 visible aria-hidden 維持
  const goalStatusInvariants = [
    /<span aria-hidden="true">完了<\/span>/.test(gp),
    (gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []).length >= 2,
    (gp.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? []).length >= 2,
  ]
  if (goalStatusInvariants.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: goal-status 5 visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  // 6. iter858 invariant: sprint-card action 5 静的 aria-hidden 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
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

  console.log(`\n=== Findings (goal-kr-add-empty-aria-hidden-iter860) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
