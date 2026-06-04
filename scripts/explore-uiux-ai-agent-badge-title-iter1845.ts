/**
 * Phase 6.15 loop iter1845: comment-thread AI Agent badge に title 付与
 * (iter1841 StatusBadge / iter1843 MustBadge と同 pattern を AI Agent badge にも展開、
 * 略語 badge hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/comment-thread.tsx line 201-209 の AI Agent badge は visible
 *   "AI" 略語のみ + aria-label "AI Agent による投稿" で SR 提供だが、sighted は hover で
 *   略語 expand context 即把握できなかった。
 *
 * 修正 (src/components/workspace/comment-thread.tsx, 1 line 追加 + 3 line comment 追加):
 *   <span role="img"> に `title="AI Agent による投稿"` 付与。aria-label / role / className
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-ai-agent-badge-title-iter1845.ts
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

  const thread = readFileSync(
    resolve(here, '../src/components/workspace/comment-thread.tsx'),
    'utf8',
  )

  // --- 1. AI Agent badge title 付与済 ---
  if (!thread.includes('title="AI Agent による投稿"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'AI Agent badge title が無い',
    })
  }

  // --- 2. AI Agent badge aria-label 維持 ---
  if (!thread.includes('aria-label="AI Agent による投稿"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'AI Agent badge aria-label が消えている',
    })
  }

  // --- 3. iter1843 MustBadge title 維持 ---
  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
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

  // --- 6. iter1789 comment-edit-cancel title 維持 ---
  if (!thread.includes('title="キャンセル — コメントの編集を破棄"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1789 comment-edit-cancel title が消えている',
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
      '(なし) — comment-thread AI Agent badge に title 付与で略語 badge hover disclosure、iter1843-1777 invariant 不変',
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
