/**
 * Phase 6.15 loop iter1843: MustBadge 共通 component に title 付与 (iter1841 StatusBadge と同
 * pattern、共通 component 1 修正で全 caller 一括 hover disclosure 改善)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/must-badge.tsx は aria-label "MUST タスク" のみで sighted は
 *   hover で MUST status の意味づけ即把握できなかった (iconOnly path で visible text 無)。
 *
 * 修正 (src/components/workspace/must-badge.tsx, 1 line 追加 + 3 line comment 追加):
 *   <span role="img"> に `title="MUST タスク"` 付与。aria-label / role / className /
 *   data-testid 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-must-badge-title-iter1843.ts
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

  const badge = readFileSync(resolve(here, '../src/components/workspace/must-badge.tsx'), 'utf8')

  // --- 1. MustBadge title 付与済 ---
  if (!badge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'MustBadge title が無い',
    })
  }

  // --- 2. MustBadge aria-label 維持 ---
  if (!badge.includes('aria-label="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'MustBadge aria-label が消えている',
    })
  }

  // --- 3. role="img" 維持 ---
  if (!badge.includes('role="img"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'MustBadge role="img" が消えている',
    })
  }

  // --- 4. iter1841 StatusBadge title 維持 ---
  const statusBadge = readFileSync(
    resolve(here, '../src/components/workspace/status-badge.tsx'),
    'utf8',
  )
  if (!statusBadge.includes('title={`${cfg.shortLabel} — ステータス ${cfg.label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1841 StatusBadge title が消えている',
    })
  }

  // --- 5. iter1839 home workspace-link title 維持 ---
  const homePage = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')
  if (!homePage.includes('title={`${ws.name} を開く — slug ${ws.slug} / role ${ws.role}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1839 home workspace-link title が消えている',
    })
  }

  // --- 6. iter1817 goal-toggle title 維持 ---
  const goalsPanel = readFileSync(
    resolve(here, '../src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    !goalsPanel.includes(
      "title={`${goal.title} — Goal「${goal.title}」の KR ${open ? '一覧を閉じる' : '一覧を開く'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1817 goal-toggle title が消えている',
    })
  }

  // --- 7. iter1799 create-workspace title 維持 ---
  const createWs = readFileSync(
    resolve(here, '../src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    !createWs.includes(
      "title={isPending ? '作成中… — Workspace を作成中' : '作成 — Workspace を新規作成'}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1799 create-workspace title が消えている',
    })
  }

  // --- 8. iter1777 view-switcher Today title 維持 ---
  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — MustBadge 共通 component に title 付与で全 caller の sighted hover disclosure 一括改善、iter1841-1777 invariant 不変',
    )
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
