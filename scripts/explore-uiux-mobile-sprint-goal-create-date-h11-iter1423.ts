/**
 * Phase 6.15 loop iter1423 (mode-M = Mobile audit):
 * Sprint / Goal の **create form** date input が `<Input type="date">` 既定 `h-8`
 * (32px) のままで WCAG 2.5.5 (target size ≥ 44x44) 未達。iPhone SE (375x667) で
 * 直接観察した。Edit form (sprint-edit-start/end は iter1207 で既に min-h-11 化済) /
 * mock-submit-form / item-edit-dialog / time-entry create-form は h-11 化済だが、
 * Sprint と Goal の **create form** だけ取り残されていた。
 *
 * 修正: 4 date input に `className="min-h-11"` を追加 (1 行 ×4)。
 *   - sprints-panel.tsx (sprint-start, sprint-end) — create form
 *   - goals-panel.tsx (goal-start, goal-end) — create form
 *
 * 経路 B (source-side regex assert)。経路 A (MCP) でも iPhone SE で /sprints の
 * sprint-start / sprint-end が 311x32 → 311x44 へ復活することを確認可。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-mobile-sprint-goal-create-date-h11-iter1423.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function checkContains(src: string, needle: string, label: string, findings: Finding[]): void {
  if (src.includes(needle)) return
  findings.push({
    level: 'error',
    message: `${label}: 期待 fragment 不在 → ${needle.slice(0, 60)}...`,
  })
}

function main(): void {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // sprint-start (create form): aria-label `: ${startDate}` 直後に className="min-h-11"
  checkContains(
    sp,
    `: \`開始 — Sprint 開始日 (現在: \${startDate})\`\n                  }\n                  className="min-h-11"`,
    'sprints-panel.tsx sprint-start create form min-h-11',
    findings,
  )
  // sprint-end (create form)
  checkContains(
    sp,
    `: \`終了 — Sprint 終了日 (現在: \${endDate})\`\n                  }\n                  className="min-h-11"`,
    'sprints-panel.tsx sprint-end create form min-h-11',
    findings,
  )
  // goal-start (create form)
  checkContains(
    gp,
    `: \`開始 — Goal 開始日 (現在: \${startDate})\`\n                  }\n                  className="min-h-11"`,
    'goals-panel.tsx goal-start create form min-h-11',
    findings,
  )
  // goal-end (create form)
  checkContains(
    gp,
    `: \`終了 — Goal 終了日 (現在: \${endDate})\`\n                  }\n                  className="min-h-11"`,
    'goals-panel.tsx goal-end create form min-h-11',
    findings,
  )

  // iter1207 invariant: edit form (`text-xs` 併設) は崩していないこと
  checkContains(
    sp,
    `className="min-h-11 text-xs"`,
    'sprints-panel.tsx edit form min-h-11 text-xs invariant',
    findings,
  )

  console.log(`\n=== Findings (iter1423 sprint/goal create date min-h-11) ===`)
  if (findings.length === 0) console.log('(なし) — 4 date input + edit-form invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
