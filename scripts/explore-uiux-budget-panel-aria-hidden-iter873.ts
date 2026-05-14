/**
 * Phase 6.15 loop iter 873 (mode-D Desktop a11y) —
 * budget-panel 3 button visible (上限を変更 / キャンセル / 保存) を aria-hidden span で wrap.
 *
 * 課題: src/components/workspace/budget-panel.tsx の 3 button:
 *   - 上限を変更 (行 198): aria-label "AI 月次コスト上限と警告閾値の編集モードを開く"
 *   - 編集キャンセル (行 286): aria-label "AI 月次コスト上限の編集をキャンセル"
 *   - 保存 動的 (行 301): aria-label "AI 月次コスト上限と警告閾値を保存" / 保存中…
 * 各々 aria-label が完全 content を持つのに、内側 visible は aria-hidden 無し →
 * SR ユーザに重複読み上げ。iter844-872 sweep の続編で 3 callsite 一括対応。
 *
 * fix (1 ファイル ~3 行差分):
 *   - 各 visible label を <span aria-hidden="true"> で wrap
 *   - aria-label / data-testid / aria-busy 維持
 *
 * 検証: source-side regex assert + iter735-872 invariant cross-check。
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

  // 1. 上限を変更 visible
  if (/<span aria-hidden="true">上限を変更<\/span>/.test(bp)) {
    findings.push({
      level: 'info',
      message: `budget-edit-btn visible "上限を変更" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `budget-edit-btn visible aria-hidden 未統合` })
  }

  // 2. キャンセル visible
  if (/<span aria-hidden="true">キャンセル<\/span>/.test(bp)) {
    findings.push({
      level: 'info',
      message: `budget-edit-cancel visible "キャンセル" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `budget-edit-cancel visible aria-hidden 未統合` })
  }

  // 3. 保存 動的 visible
  if (
    /<span aria-hidden="true">\s*\{update\.isPending \? '保存中…' : '保存'\}\s*<\/span>/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `budget-save 動的 visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `budget-save 動的 visible aria-hidden 未統合` })
  }

  // 4. aria-label 維持
  const ariaLabels = [
    /aria-label="AI 月次コスト上限と警告閾値の編集モードを開く"/.test(bp),
    /aria-label="AI 月次コスト上限の編集をキャンセル"/.test(bp),
    /aria-label=\{[\s\S]+?'AI 月次コスト上限と警告閾値を保存'/.test(bp),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `budget-panel 3 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel aria-label regression (${ariaLabels.filter(Boolean).length}/3)`,
    })
  }

  // 5. iter872 invariant
  const tet = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}\s*<\/span>/.test(
      tet,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: time-entries-sync aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
  }

  // 6. iter735 invariant
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

  console.log(`\n=== Findings (budget-panel-aria-hidden-iter873) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
