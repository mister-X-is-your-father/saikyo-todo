/**
 * Phase 6.15 loop iter1839: home page workspace-link Link に title 付与
 * (iter1837 forecast chip と同 pattern を workspace-link にも展開、Link hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/app/page.tsx の workspace-link は aria-label `${ws.name} を開く — slug ${slug} / role ${role}`
 *   で workspace 全 context を SR 提供だが、内側 div は aria-hidden="true" で sighted は hover で
 *   slug / role context 即把握できなかった。
 *
 * 修正 (src/app/page.tsx, 1 line 追加 + 3 line comment 追加):
 *   <Link> に `title={同 aria-label}` 付与。aria-label / href / className / data-testid 完全不変。
 *
 * 実行: pnpm tsx scripts/explore-uiux-workspace-link-title-iter1839.ts
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

  const homePage = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')

  // --- 1. workspace-link title 付与済 ---
  if (!homePage.includes('title={`${ws.name} を開く — slug ${ws.slug} / role ${ws.role}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-link title が無い',
    })
  }

  // --- 2. iter1781 home logout title 維持 ---
  if (!homePage.includes('title="ログアウト — ログイン画面に戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1781 home logout title が消えている',
    })
  }

  // --- 3. iter1837 forecast chip title 維持 ---
  const opBoard = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!opBoard.includes('title={`今日完了予測 ${formatTodayForecastJa(forecast)}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1837 forecast chip title が消えている',
    })
  }

  // --- 4. iter1835 role Badge title 維持 ---
  const wsHeader = readFileSync(
    resolve(here, '../src/components/workspace/workspace-header.tsx'),
    'utf8',
  )
  if (!wsHeader.includes('title={`${role} — あなたの workspace role`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1835 role Badge title が消えている',
    })
  }

  // --- 5. iter1831 archive-restore title 維持 ---
  const archivePanel = readFileSync(
    resolve(here, '../src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (
    !archivePanel.includes(
      '`復元 — 「${item.title}」を復元 (${fmt(item.archivedAt)} にアーカイブ)`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1831 archive-restore title が消えている',
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
      '(なし) — workspace-link に title 付与で Link hover disclosure、iter1837-1777 invariant 不変',
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
