/**
 * Phase 6.15 loop iter 794 (mode-D Desktop a11y) —
 * goals-panel KeyResultList の KR 追加 form aria-label に goal title 含めて page-specific 化。
 *
 * 課題: goals-panel.tsx 行 747 の KR 追加 form aria-label="Key Result 追加フォーム" は
 *   静的で、複数 Goal card が disclosure で開いている時に SR ユーザは form
 *   landmark navigation で「Key Result 追加フォーム」 が複数並び、どの Goal の
 *   KR form か区別できなかった。iter793 SprintCard 期間編集 form と同 pattern
 *   (form landmark page-specific naming sweep)。
 *
 * fix (1 ファイル ~10 行差分):
 *   - KeyResultList signature に goalTitle prop を追加
 *   - caller (Goal card 内 596行) で goal.title を渡す
 *   - aria-label を `Goal「${goalTitle}」の Key Result 追加フォーム` に動的化
 *
 * 検証: source-side regex assert + iter735-793 invariant cross-check。
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
  const hasDynamicLabel = /aria-label=\{`Goal「\$\{goalTitle\}」の Key Result 追加フォーム`\}/.test(
    gp,
  )
  const oldStaticGone = !gp.includes('aria-label="Key Result 追加フォーム"')
  const hasGoalTitleProp = /goalTitle: string/.test(gp)
  const callsWithGoalTitle = /goalTitle=\{goal\.title\}/.test(gp)
  if (hasDynamicLabel && oldStaticGone && hasGoalTitleProp && callsWithGoalTitle) {
    findings.push({
      level: 'info',
      message: `goals-panel KR 追加 form aria-label dynamic (goal title) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel KR form aria-label 不完全 (dynamic=${hasDynamicLabel} oldGone=${oldStaticGone} prop=${hasGoalTitleProp} call=${callsWithGoalTitle})`,
    })
  }

  // iter793 invariant: sprint-edit form aria-label dynamic
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Sprint「\$\{sprint\.name\}」期間編集フォーム`\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter793 invariant: sprint-edit form aria-label dynamic 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter793 invariant: 破壊` })
  }

  // iter792 invariant: mock-submit-form Submit idle aria-label
  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (/'工数を送信 \(mock-timesheet 入力フォーム\)'/.test(msf)) {
    findings.push({
      level: 'info',
      message: `iter792 invariant: mock-submit-form Submit idle aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter792 invariant: 破壊` })
  }

  // iter791 invariant: decompose-proposals DoD aria-label
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/提案 DoD \(MUST 必須、最大 2000 文字、完了条件を具体記述\)/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter791 invariant: decompose-proposals DoD aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter791 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (kr-add-form-name-iter794) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
