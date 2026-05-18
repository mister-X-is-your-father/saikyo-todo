/**
 * Phase 6.15 loop iter 960 (mode-M Mobile) — sprints-panel 新規 Sprint 作成 form の
 * 3 input (sprint-name / sprint-start / sprint-end) に enterKeyHint="next" を追加。
 * iter949/950/951/959 enterKeyHint sweep 5 form 目、sprint 系 form 補完。
 *
 * 課題: sprints-panel 新規 Sprint form の 3 input は enterKeyHint 未指定で Mobile
 *   keyboard の Enter button が default 表示、user は「次の field か submit か」を
 *   判別不能。iter949 create-workspace / iter950 mock-login / iter951 mock-submit /
 *   iter959 budget-panel の pattern と不整合。
 *
 * fix: sprints-panel.tsx で
 *   1. sprint-name (IMEInput) に enterKeyHint="next" (名前 → 開始日 へ進む意図)
 *   2. sprint-start (Input type=date) に enterKeyHint="next" (開始日 → 終了日 へ進む意図)
 *   3. sprint-end (Input type=date) に enterKeyHint="next" (終了日 → ゴール Textarea へ進む)
 *   ゴール Textarea は Cmd/Ctrl+Enter で create する独自 keydown handler を持つので
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
  const target = 'src/components/workspace/sprints-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. sprint-name に enterKeyHint="next"
  const nameCtx = src.slice(
    Math.max(0, src.indexOf('id="sprint-name"') - 50),
    src.indexOf('id="sprint-name"') + 600,
  )
  if (!/enterKeyHint="next"/.test(nameCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: sprint-name に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `sprint-name enterKeyHint="next" OK` })
  }

  // 2. sprint-start に enterKeyHint="next"
  const startCtx = src.slice(
    Math.max(0, src.indexOf('id="sprint-start"') - 50),
    src.indexOf('id="sprint-start"') + 400,
  )
  if (!/enterKeyHint="next"/.test(startCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: sprint-start に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `sprint-start enterKeyHint="next" OK` })
  }

  // 3. sprint-end に enterKeyHint="next"
  const endCtx = src.slice(
    Math.max(0, src.indexOf('id="sprint-end"') - 50),
    src.indexOf('id="sprint-end"') + 400,
  )
  if (!/enterKeyHint="next"/.test(endCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: sprint-end に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `sprint-end enterKeyHint="next" OK` })
  }

  // 4. iter941 invariant: sprints-panel 既存 sprint 期間編集 date input min-h-11
  // (parallel iter941 で sprints-panel min-h-11 fix が landed)
  if (!/min-h-11 text-xs/.test(src) && !/className="min-h-11/.test(src)) {
    findings.push({ level: 'warning', message: `iter941 parallel invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter941 parallel invariant OK` })
  }

  // 5. iter959 invariant: budget-panel enterKeyHint
  const budgetSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(budgetSrc) || !/enterKeyHint="send"/.test(budgetSrc)) {
    findings.push({ level: 'warning', message: `iter959 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter959 invariant OK` })
  }

  // 6. iter951 invariant: mock-submit-form enterKeyHint
  const mockSubmitSrc = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(mockSubmitSrc) || !/enterKeyHint="send"/.test(mockSubmitSrc)) {
    findings.push({ level: 'warning', message: `iter951 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter951 invariant OK` })
  }

  // 7. iter735 invariant
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

  console.log(`\n=== Findings (sprints-panel-enter-key-hint-iter960) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
