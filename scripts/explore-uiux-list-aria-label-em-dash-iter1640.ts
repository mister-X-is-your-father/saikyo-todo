/**
 * Phase 6.15 loop iter1640: 9 list <ul> の `${entity} 一覧 ${N} 件` space-separator
 * aria-label を iter1633 dashboard MUST list sweep の em-dash 区切に統一。
 *
 * iter1633 (dashboard-view.tsx MUST Item 一覧) で確立した「list 親 ul の `${entity} 一覧
 * ${N} 件` パターンを em-dash 区切に統一」を全 codebase に展開。残 9 件を一気に sweep:
 *
 *   - sprint-swimlane-disclosure.tsx   Sprint Swimlane lane 一覧
 *   - decompose-proposals-panel.tsx    AI 分解提案 一覧
 *   - sprints-panel.tsx                Sprint 一覧
 *   - goals-panel.tsx                  Goal 一覧
 *   - goals-panel.tsx                  Key Result 一覧
 *   - comment-thread.tsx               コメント一覧
 *   - workflows-panel.tsx              Workflow 一覧
 *   - integrations-panel.tsx           API 連携 source 一覧
 *   - template-items-editor.tsx        Template 子 Item 一覧
 *   - templates-panel.tsx              Template 一覧
 *
 * 各 visible content (list items 本体) は無変更で voice control prefix-match
 * 「click ${entity} 一覧」 / SR list navigation の context は維持。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-list-aria-label-em-dash-iter1640.ts
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
      path: '../src/components/workspace/sprint-swimlane-disclosure.tsx',
      mustContain: 'aria-label={`Sprint Swimlane lane 一覧 — ${rows.length} 件`}',
    },
    {
      path: '../src/components/workspace/decompose-proposals-panel.tsx',
      mustContain: 'aria-label={`AI 分解提案 一覧 — ${list.length} 件`}',
    },
    {
      path: '../src/components/workspace/sprints-panel.tsx',
      mustContain: 'aria-label={`Sprint 一覧 — ${list.data.length} 件`}',
    },
    {
      path: '../src/components/workspace/goals-panel.tsx',
      mustContain: 'aria-label={`Goal 一覧 — ${list.data.length} 件`}',
    },
    {
      path: '../src/components/workspace/goals-panel.tsx',
      mustContain: 'aria-label={`Key Result 一覧 — ${(list.data ?? []).length} 件`}',
    },
    {
      path: '../src/components/workspace/comment-thread.tsx',
      mustContain: 'aria-label={`コメント一覧 — ${comments!.length} 件`}',
    },
    {
      path: '../src/components/workflow/workflows-panel.tsx',
      mustContain: 'aria-label={`Workflow 一覧 — ${list.data!.length} 件`}',
    },
    {
      path: '../src/components/integrations/integrations-panel.tsx',
      mustContain: 'aria-label={`API 連携 source 一覧 — ${list.data!.length} 件`}',
    },
    {
      path: '../src/components/template/template-items-editor.tsx',
      mustContain: 'aria-label={`Template 子 Item 一覧 — ${items.data!.length} 件`}',
    },
    {
      path: '../src/components/template/templates-panel.tsx',
      mustContain: 'aria-label={`Template 一覧 — ${list.data!.length} 件`}',
    },
  ]

  for (const c of cases) {
    const src = readFileSync(resolve(here, c.path), 'utf8')
    if (!src.includes(c.mustContain)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${c.path}: em-dash convention 未着地`,
      })
    }
  }

  // 旧 space-separator pattern は code 行 (template literal) でゼロであるべき
  for (const c of cases) {
    const src = readFileSync(resolve(here, c.path), 'utf8')
    // Generate old pattern by stripping ' — '
    const old = c.mustContain.replace(' — ', ' ')
    if (src.includes(old)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${c.path}: 旧 space-separator pattern が残存 (${old.slice(0, 60)})`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 10 list aria-label が em-dash convention で統一')
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
