/**
 * Phase 6.15 loop iter1645: 5 disclosure pattern の aria-controls dangling ARIA id-ref を fix。
 * iter1637 quick-add aria-describedby と同 pattern (WAI-ARIA spec 1.2 §9.4 違反)。
 *
 * disclosure trigger button の aria-controls が静的に controlled id を指していたが、
 * controlled element 自体は `{open && (...)}` 条件下のみ render される (collapsed
 * 時は DOM に存在しない)。SR (NVDA / VoiceOver) で「読み上げ予定の領域が見つからない」
 * 状態になり stuttering する報告あり。
 *
 * 対象 5 file:
 *   - activity-log.tsx              detail pre (open && hasDetail)
 *   - goals-panel.tsx               CardContent goal-body (open)
 *   - workflows-panel.tsx (×2)      wf-runs / wf-run-nodes (runsOpen / isOpen)
 *   - integrations-panel.tsx        src-imports (importsOpen)
 *   - templates-panel.tsx           CardContent template-body (expandedId === t.id)
 *
 * 修正: `aria-controls={open ? targetId : undefined}` に変更 (open 時のみ参照、
 * collapsed 時は属性自体を出力しない)。aria-expanded は元から open 状態で boolean を
 * 返すため disclosure pattern 完全性は維持。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-aria-controls-conditional-iter1645.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const cases: { path: string; mustContain: string }[] = [
    {
      path: '../src/components/workspace/activity-log.tsx',
      mustContain: 'aria-controls={open ? detailId : undefined}',
    },
    {
      path: '../src/components/workspace/goals-panel.tsx',
      mustContain: 'aria-controls={open ? `goal-body-${goal.id}` : undefined}',
    },
    {
      path: '../src/components/workflow/workflows-panel.tsx',
      mustContain: 'aria-controls={runsOpen ? `wf-runs-${wf.id}` : undefined}',
    },
    {
      path: '../src/components/workflow/workflows-panel.tsx',
      mustContain: 'aria-controls={isOpen ? `wf-run-nodes-${r.id}` : undefined}',
    },
    {
      path: '../src/components/integrations/integrations-panel.tsx',
      mustContain: 'aria-controls={importsOpen ? `src-imports-${src.id}` : undefined}',
    },
    {
      path: '../src/components/template/templates-panel.tsx',
      mustContain: 'expandedId === t.id ? `template-body-${t.id}` : undefined',
    },
  ]

  for (const c of cases) {
    const src = readFileSync(resolve(here, c.path), 'utf8')
    if (!src.includes(c.mustContain)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${c.path}: conditional aria-controls 未着地 (${c.mustContain.slice(0, 60)}...)`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 6 disclosure aria-controls が conditional 化 (dangling ARIA id-ref 解消)')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
