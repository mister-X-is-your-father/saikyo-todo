/**
 * Phase 6.15 loop iter 961 (mode-M Mobile) — goals-panel 新規 Goal 作成 form の
 * 3 input (goal-title / goal-start / goal-end) に enterKeyHint="next" を追加。
 * iter949/950/951/959/960 enterKeyHint sweep 6 form 目、Goal 系 form 補完。
 *
 * 課題: goals-panel 新規 Goal form の 3 input は enterKeyHint 未指定で sprints-panel
 *   (iter960) と同様の漏れだった。Mobile keyboard で「次の field か submit か」
 *   user 判別不能。
 *
 * fix: goals-panel.tsx で
 *   1. goal-title (IMEInput) に enterKeyHint="next" (Objective → 開始日 へ)
 *   2. goal-start (Input type=date) に enterKeyHint="next" (開始日 → 終了日 へ)
 *   3. goal-end (Input type=date) に enterKeyHint="next" (終了日 → 説明 Textarea へ)
 *   説明 Textarea は Cmd/Ctrl+Enter で create する独自 keydown handler を持つので
 *   enterKeyHint 非適用 (default Enter は改行)。+3/-0 行 (1 file)。視覚 / 動作不変。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/goals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  function checkInputContext(id: string, suffix: string): void {
    const idx = src.indexOf(`id="${id}"`)
    if (idx < 0) {
      findings.push({ level: 'error', message: `${target}: id="${id}" 不在` })
      return
    }
    const ctx = src.slice(Math.max(0, idx - 50), idx + 600)
    if (!new RegExp(`enterKeyHint="${suffix}"`).test(ctx)) {
      findings.push({
        level: 'warning',
        message: `${target}: ${id} 周辺に enterKeyHint="${suffix}" 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `${id} enterKeyHint="${suffix}" OK` })
    }
  }

  checkInputContext('goal-title', 'next')
  checkInputContext('goal-start', 'next')
  checkInputContext('goal-end', 'next')

  // iter960 invariant: sprints-panel enterKeyHint
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(sprintsSrc)) {
    findings.push({ level: 'warning', message: `iter960 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter960 invariant OK` })
  }

  // iter959 invariant: budget-panel enterKeyHint
  const budgetSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(budgetSrc) || !/enterKeyHint="send"/.test(budgetSrc)) {
    findings.push({ level: 'warning', message: `iter959 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter959 invariant OK` })
  }

  // iter951 invariant: mock-submit-form enterKeyHint
  const mockSubmitSrc = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(mockSubmitSrc) || !/enterKeyHint="send"/.test(mockSubmitSrc)) {
    findings.push({ level: 'warning', message: `iter951 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter951 invariant OK` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (goals-panel-enter-key-hint-iter961) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
