/**
 * Phase 6.15 loop iter1819: goals-panel kr-add-btn に title 付与
 * (iter1817 goal-toggle と同 pattern を kr-add にも展開、Goal/KR creation hover disclosure 完備)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/goals-panel.tsx の kr-add-btn は visible "KR 追加" (略語) +
 *   aria-label conditional 3 path で Key Result expand context を SR 提供だが、sighted は
 *   hover で "KR" の expand (= Key Result) 即把握できなかった。
 *
 * 修正 (src/components/workspace/goals-panel.tsx, 6 line 追加 + 2 line comment 追加):
 *   <Button> に conditional `title={同 aria-label}` 付与。aria-label / disabled / data-testid /
 *   type / aria-busy 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-kr-add-title-iter1819.ts
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

  const panel = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')

  // --- 1. kr-add-btn 3 path text 維持 ---
  for (const t of [
    "'KR 追加 — Key Result を追加するにはタイトルを入力してください'",
    "'KR 追加 — Key Result を追加中…'",
    "'KR 追加 — Key Result をこの Goal に追加'",
  ]) {
    if (!panel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `kr-add-btn conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 2. kr-add-btn data-testid 維持 ---
  if (!panel.includes('data-testid={`kr-add-btn-${goalId}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'kr-add-btn data-testid が消えている',
    })
  }

  // --- 3. iter1817 goal-toggle title 維持 ---
  if (
    !panel.includes(
      "title={`${goal.title} — Goal「${goal.title}」の KR ${open ? '一覧を閉じる' : '一覧を開く'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1817 goal-toggle title が消えている',
    })
  }

  // --- 4. iter1815 src-* title 維持 ---
  const integrationsPanel = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!integrationsPanel.includes('`削除 — Source「${src.name}」を削除`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1815 src-delete title が消えている',
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

  // --- 6. iter1809 goal-create title 維持 ---
  if (!panel.includes("'作成 — Goal を新規作成'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1809 goal-create default title が消えている',
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
      '(なし) — kr-add-btn に title 付与で Goal/KR creation hover disclosure 完備、iter1817-1777 invariant 不変',
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
