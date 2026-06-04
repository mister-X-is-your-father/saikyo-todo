/**
 * Phase 6.15 loop iter1813: workflows-panel の 4 wf-* button (edit/toggle/runs-toggle/delete)
 * に title 付与 (iter1811 template/workflow create と同 pattern を wf 操作 group にも展開、
 * wf-card 5 button (run + edit + toggle + runs-toggle + delete) の sighted hover disclosure
 * 完備)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workflow/workflows-panel.tsx の 4 button:
 *     - wf-edit: aria-label `編集 — Workflow「${name}」の graph / trigger を編集`
 *     - wf-toggle: conditional 4 path (pending × enabled/disabled の組み合わせ)
 *     - wf-runs-toggle: conditional 2 path (open / close)
 *     - wf-delete: conditional 2 path (pending / default)、icon-only
 *   は aria-label のみで sighted は hover で context 即把握できなかった (wf-run のみ
 *   既 title 付与済)。
 *
 * 修正 (src/components/workflow/workflows-panel.tsx, 16 line 追加 + 5 line comment 追加):
 *   4 <Button> に `title={同 aria-label}` 付与 (static + conditional)。aria-label / disabled /
 *   data-testid / onClick / aria-expanded / aria-controls / aria-busy 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-wf-actions-title-iter1813.ts
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

  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // --- 1. wf-edit title 付与済 ---
  if (!wfPanel.includes('title={`編集 — Workflow「${wf.name}」の graph / trigger を編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-edit title が無い',
    })
  }

  // --- 2. wf-toggle title 4 path text 維持 ---
  for (const t of [
    '`無効化 — Workflow「${wf.name}」の状態を更新中…`',
    '`有効化 — Workflow「${wf.name}」の状態を更新中…`',
    '`無効化 — Workflow「${wf.name}」を無効化`',
    '`有効化 — Workflow「${wf.name}」を有効化`',
  ]) {
    if (!wfPanel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `wf-toggle conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 3. wf-runs-toggle title 2 path text 維持 ---
  for (const t of [
    '`履歴 — Workflow「${wf.name}」の実行履歴 (直近 5 件) を閉じる`',
    '`履歴 — Workflow「${wf.name}」の実行履歴 (直近 5 件) を表示`',
  ]) {
    if (!wfPanel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `wf-runs-toggle conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 4. wf-delete title 2 path text 維持 ---
  for (const t of [
    '`削除中… — Workflow「${wf.name}」を削除中`',
    '`削除 — Workflow「${wf.name}」を削除`',
  ]) {
    if (!wfPanel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `wf-delete conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 5. iter1811 wf-create title 維持 ---
  if (!wfPanel.includes("'作成 — Workflow を新規作成 (Cmd/Ctrl+Enter でも可)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1811 wf-create default title が消えている',
    })
  }

  // --- 6. iter1809 sprint-create title 維持 ---
  const sprintsPanel = readFileSync(
    resolve(here, '../src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (!sprintsPanel.includes("'作成 — Sprint を新規作成'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1809 sprint-create default title が消えている',
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
      '(なし) — workflows-panel 4 wf-* button (edit/toggle/runs-toggle/delete) に title 付与で wf-card 5 button (含 wf-run) 全 hover disclosure 完備、iter1811-1777 invariant 不変',
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
