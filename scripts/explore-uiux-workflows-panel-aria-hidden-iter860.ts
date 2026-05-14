/**
 * Phase 6.15 loop iter860 — workflows-panel.tsx の 5 button visible text を aria-hidden
 * span で wrap した regression guard。
 *
 * 対象 button (Workflow Card + Editor Dialog):
 *   1. 編集 button — visible "編集" (Pencil icon + text)
 *   2. 無効化/有効化 toggle — visible `{wf.enabled ? '無効化' : '有効化'}`
 *   3. 履歴 disclosure — visible "履歴" (Chevron icon + text)
 *   4. editor キャンセル — visible "キャンセル"
 *   5. editor 保存 — visible `{saving ? '保存中…' : '保存'}`
 *
 * 既存 wrap: 175 行 (作成 submit), 338 行 (実行 button)。本 iter で 5 件追加 = 計 7 件。
 *
 *   pnpm tsx scripts/explore-uiux-workflows-panel-aria-hidden-iter860.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workflow/workflows-panel.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  // 1. 編集 button
  if (!/<span aria-hidden="true">編集<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '編集 button visible wrap が無い' })
  }
  // 2. 無効化/有効化 toggle
  if (!/<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '無効化/有効化 toggle visible wrap が無い' })
  }
  // 3. 履歴 disclosure
  if (!/<span aria-hidden="true">履歴<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '履歴 button visible wrap が無い' })
  }
  // 4. editor キャンセル
  if (
    !/aria-label=\{`Workflow「\$\{wf\.name\}」の編集をキャンセル`\}[\s\S]{0,80}<span aria-hidden="true">キャンセル<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: 'editor キャンセル button visible wrap が無い' })
  }
  // 5. editor 保存
  if (!/<span aria-hidden="true">\{saving \? '保存中…' : '保存'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: 'editor 保存 button visible wrap が無い' })
  }

  // 6. 既存 wrap (作成 submit / 実行 button) 健在
  if (!/<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '既存 作成 button wrap が消えた (regression)' })
  }
  if (!/<span aria-hidden="true">\{trigger\.isPending \? '実行中…' : '実行'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '既存 実行 button wrap が消えた (regression)' })
  }

  // 7. iter127 invariant: panel landmark に aria-label
  if (!src.includes('aria-label="Workflow 一覧と新規作成"')) {
    findings.push({
      level: 'error',
      message: 'panel aria-label="Workflow 一覧と新規作成" が消えた (iter127)',
    })
  }

  // 8. raw visible 単独行残置なし
  const rawRows = src.split('\n').filter((line) => /^\s*(編集|履歴|キャンセル|保存)\s*$/.test(line))
  if (rawRows.length > 0) {
    findings.push({
      level: 'error',
      message: `raw visible 単独行 ${rawRows.length} 件残存: ${rawRows.map((r) => r.trim()).join(', ')}`,
    })
  }

  console.log(`\n=== Findings (workflows-panel-aria-hidden iter860) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
