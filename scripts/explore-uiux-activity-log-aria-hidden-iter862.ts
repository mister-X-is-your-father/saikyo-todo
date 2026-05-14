/**
 * Phase 6.15 loop iter 862 (mode-D Desktop a11y) —
 * activity-log ActivityRow visible 3 spot を aria-hidden span で wrap (一括 3 callsite).
 *
 * 課題: src/components/workspace/activity-log.tsx の ActivityRow 内 3 visible spot は
 * 各々 隣接 aria-label / 親 aria-label が完全 content を含むのに、内側 visible text は
 * aria-hidden 無し → SR ユーザに重複読み上げ:
 *   1. label (行 166): 直前 icon span に aria-label "操作種別: {label}" あり、visible {label} は重複
 *   2. AI/user バッジ (行 175): 親 span aria-label "実行者: AI Agent / ユーザ" あり、visible "AI/user" は重複
 *   3. 詳細 toggle (行 200): button aria-label が完全 content (2 state) を含む、visible "詳細を{閉じる/見る}" は重複
 * iter844-861 sweep の続編で activity-log 内 3 callsite 一括対応。
 *
 * fix (1 ファイル ~4 行差分):
 *   - <span className="font-medium" aria-hidden="true">{label}</span> に変更
 *   - AI/user バッジ visible を <span aria-hidden="true"> で wrap
 *   - 詳細 toggle visible を <span aria-hidden="true"> で wrap
 *   - 既存 aria-label / role="img" は維持
 *
 * 検証: source-side regex assert + iter735-861 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )

  // 1. label span aria-hidden 統合 (icon と並ぶ visible label)
  if (/<span className="font-medium" aria-hidden="true">\n\s+\{label\}\n\s+<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `activity-row label visible span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-row label visible aria-hidden 未統合`,
    })
  }

  // 2. AI/user バッジ visible aria-hidden span
  if (
    /<span aria-hidden="true">\{entry\.actorType === 'agent' \? 'AI' : 'user'\}<\/span>/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `activity-row AI/user バッジ visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-row AI/user バッジ visible aria-hidden 未統合`,
    })
  }

  // 3. 詳細 toggle visible aria-hidden span
  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `activity-row 詳細 toggle visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-row 詳細 toggle visible aria-hidden 未統合`,
    })
  }

  // 4. aria-label 維持 (icon role=img + actor + toggle)
  const ariaLabels = [
    /aria-label=\{`操作種別: \$\{label\}`\}/.test(al),
    /aria-label=\{entry\.actorType === 'agent' \? '実行者: AI Agent' : '実行者: ユーザ'\}/.test(al),
    /aria-label=\{\n\s+open\n\s+\? `「\$\{label\}」の差分 \(before \/ after\) を閉じる`\n\s+: `「\$\{label\}」の差分 \(before \/ after\) を見る`\n\s+\}/.test(
      al,
    ),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `activity-row 3 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-row aria-label regression (${ariaLabels.filter(Boolean).length}/3)`,
    })
  }

  // iter861 invariant: sprint-period 3 button aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">キャンセル<\/span>/.test(sp) &&
    /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(sp) &&
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: sprint-period + empty aria-hidden 維持 OK`,
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

  console.log(`\n=== Findings (activity-log-aria-hidden-iter862) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
