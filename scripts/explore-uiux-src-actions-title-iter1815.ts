/**
 * Phase 6.15 loop iter1815: integrations-panel の 3 src-* button (toggle/imports-toggle/delete)
 * に title 付与 (iter1813 wf-actions と同 pattern を src-* button family にも展開、
 * src-card 4 button (pull + toggle + imports-toggle + delete) 全 hover disclosure 完備。
 * src-pull は既 title 付与済)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/integrations/integrations-panel.tsx の 3 button:
 *     - src-toggle: conditional 4 path、no title
 *     - src-imports-toggle: conditional 2 path、no title
 *     - src-delete: conditional 2 path、icon-only、no title
 *   は aria-label のみで sighted は hover で context 即把握できなかった。
 *
 * 修正 (src/components/integrations/integrations-panel.tsx, 12 line 追加 + 5 line comment 追加):
 *   3 <Button> に conditional `title={同 aria-label}` 付与。aria-label / disabled /
 *   data-testid / onClick / aria-expanded / aria-controls / aria-busy 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-src-actions-title-iter1815.ts
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

  const panel = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // --- 1. src-toggle title 4 path text 維持 ---
  for (const t of [
    '`無効化 — Source「${src.name}」の状態を更新中…`',
    '`有効化 — Source「${src.name}」の状態を更新中…`',
    '`無効化 — Source「${src.name}」を無効化`',
    '`有効化 — Source「${src.name}」を有効化`',
  ]) {
    if (!panel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `src-toggle conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 2. src-imports-toggle title 2 path text 維持 ---
  for (const t of [
    '`履歴 — Source「${src.name}」の Pull 履歴 (直近 5 件) を閉じる`',
    '`履歴 — Source「${src.name}」の Pull 履歴 (直近 5 件) を表示`',
  ]) {
    if (!panel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `src-imports-toggle conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 3. src-delete title 2 path text 維持 ---
  for (const t of [
    '`削除中… — Source「${src.name}」を削除中`',
    '`削除 — Source「${src.name}」を削除`',
  ]) {
    if (!panel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `src-delete conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 4. src-pull title 維持 (iter1093 既存) ---
  if (!panel.includes('title="手動 pull (sync 実行、30s timeout)"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'src-pull static title が消えている',
    })
  }

  // --- 5. iter1813 wf-edit title 維持 ---
  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (!wfPanel.includes('title={`編集 — Workflow「${wf.name}」の graph / trigger を編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1813 wf-edit title が消えている',
    })
  }

  // --- 6. iter1811 wf-create title 維持 ---
  if (!wfPanel.includes("'作成 — Workflow を新規作成 (Cmd/Ctrl+Enter でも可)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1811 wf-create default title が消えている',
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
      '(なし) — integrations-panel 3 src-* button (toggle/imports-toggle/delete) に title 付与で src-card 4 button (含 src-pull) 全 hover disclosure 完備、iter1813-1777 invariant 不変',
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
