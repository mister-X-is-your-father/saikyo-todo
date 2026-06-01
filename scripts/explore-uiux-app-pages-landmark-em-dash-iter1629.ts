/**
 * Phase 6.15 loop iter1629: src/app/ 配下 5 landmark aria-label の paren convention を
 * iter1093-1626 sweep の em-dash 区切に統一。
 *
 * iter1620 の sweep mature 報告は `grep -rEn 'aria-label.*\([^"]*\)' src/components` 範囲で
 * 検査していたが src/app/ は範囲外だったため見逃した。修正対象は landmark / nav / main
 * の container aria-label 5 件:
 *
 *   - src/app/(auth)/layout.tsx:6  `"認証 (ログイン / サインアップ)"` → `"認証 — ログイン / サインアップ"`
 *   - src/app/(workspace)/[workspaceId]/page.tsx:52  `"Workspace dashboard (Today / ...)"` → em-dash
 *   - src/app/(workspace)/[workspaceId]/page.tsx:63  `"ワークスペース内 (Goals / ...)"` → em-dash
 *   - src/app/(workspace)/[workspaceId]/goals/page.tsx:42  `"OKR / Goals (Objective + Key Results)"` → em-dash
 *   - src/app/(workspace)/[workspaceId]/workflows/page.tsx:42  `"Workflows 自動化ワークフロー (n8n 風)"`
 *      → `"Workflows — 自動化ワークフロー (n8n 風)"` (n8n 風 は content paren で残置)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-app-pages-landmark-em-dash-iter1629.ts
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

  const cases: { path: string; mustContain: string; mustNotContain: string }[] = [
    {
      path: '../src/app/(auth)/layout.tsx',
      mustContain: 'aria-label="認証 — ログイン / サインアップ"',
      mustNotContain: 'aria-label="認証 (ログイン / サインアップ)"',
    },
    {
      path: '../src/app/(workspace)/[workspaceId]/page.tsx',
      mustContain:
        'aria-label="Workspace dashboard — Today / Inbox / Kanban / Backlog / Gantt / Dashboard"',
      mustNotContain:
        'aria-label="Workspace dashboard (Today / Inbox / Kanban / Backlog / Gantt / Dashboard)"',
    },
    {
      path: '../src/app/(workspace)/[workspaceId]/page.tsx',
      mustContain:
        'aria-label="ワークスペース内 — Goals / Sprints / PDCA / Templates / Workflows / API / Time / Archive"',
      mustNotContain:
        'aria-label="ワークスペース内 (Goals / Sprints / PDCA / Templates / Workflows / API / Time / Archive)"',
    },
    {
      path: '../src/app/(workspace)/[workspaceId]/goals/page.tsx',
      mustContain: 'aria-label="OKR / Goals — Objective + Key Results"',
      mustNotContain: 'aria-label="OKR / Goals (Objective + Key Results)"',
    },
    {
      path: '../src/app/(workspace)/[workspaceId]/workflows/page.tsx',
      mustContain: 'aria-label="Workflows — 自動化ワークフロー (n8n 風)"',
      mustNotContain: 'aria-label="Workflows 自動化ワークフロー (n8n 風)"',
    },
  ]

  for (const c of cases) {
    const src = readFileSync(resolve(here, c.path), 'utf8')
    if (!src.includes(c.mustContain)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${c.path}: em-dash convention 未着地 (expected: ${c.mustContain.slice(0, 60)}...)`,
      })
    }
    if (src.includes(c.mustNotContain)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${c.path}: 旧 paren convention 残存 (${c.mustNotContain.slice(0, 60)}...)`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — src/app/ 5 landmark aria-label が em-dash convention で統一')
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
