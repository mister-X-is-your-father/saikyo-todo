/**
 * Phase 6.15 loop iter 859 (mode-D Desktop a11y) —
 * workflows-panel: 11 button visible text を aria-hidden span で wrap (一括)。
 *
 * 課題: src/components/workflow/workflows-panel.tsx は Workflow CRUD + graph
 *   editor (DAG node 定義) + trigger 設定 panel。多数の visible-text-only
 *   button が aria-label と二重読み上げになる:
 *     1. EmptyState 「作成フォームへ」 button
 *     2. Workflow card 「編集」 (Pencil icon)
 *     3. Workflow card 有効化/無効化 toggle
 *     4. Workflow card 「履歴」 disclosure (chevron icon)
 *     5. node-preset button (× N、ループ内): visible "+ {preset.type}"
 *     6. trigger preset 「manual」
 *     7. trigger preset 「cron」
 *     8. trigger preset 「item-event」
 *     9. trigger preset 「webhook」
 *    10. editor dialog 「キャンセル」 footer button
 *    11. editor dialog 「保存」 footer button
 *
 * fix (1 file ~11 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter800-858 sweep の続編 (workflows panel family の拡大投入)
 *   - iter838 で wf-create 1 件、iter859 で残り 11 件 一気に消化
 *
 * 検証: source-side regex assert + iter735/857/858 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  const checks: Array<[string, RegExp]> = [
    ['EmptyState 作成フォームへ', /<span aria-hidden="true">作成フォームへ<\/span>/],
    ['編集 button', /<span aria-hidden="true">編集<\/span>/],
    [
      '有効化/無効化 toggle',
      /<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/,
    ],
    ['履歴 disclosure', /<span aria-hidden="true">履歴<\/span>/],
    ['node-preset (+ {preset.type})', /<span aria-hidden="true">\+ \{preset\.type\}<\/span>/],
    ['trigger preset manual', /<span aria-hidden="true">manual<\/span>/],
    ['trigger preset cron', /<span aria-hidden="true">cron<\/span>/],
    ['trigger preset item-event', /<span aria-hidden="true">item-event<\/span>/],
    ['trigger preset webhook', /<span aria-hidden="true">webhook<\/span>/],
    ['editor dialog キャンセル', /<span aria-hidden="true">キャンセル<\/span>/],
    ['editor dialog 保存', /<span aria-hidden="true">\{saving \? '保存中…' : '保存'\}<\/span>/],
  ]
  for (const [label, re] of checks) {
    if (re.test(wp)) {
      findings.push({ level: 'info', message: `${label} aria-hidden 統合 OK` })
    } else {
      findings.push({ level: 'warning', message: `${label} aria-hidden 未統合` })
    }
  }

  // iter838 invariant: wf-create-btn 「作成中…」/「作成」 aria-hidden 維持
  if (/<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter838 invariant: wf-create-btn aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter838 invariant: 破壊` })
  }

  // 各 button aria-label 維持 (主要)
  const labelChecks: Array<[string, RegExp]> = [
    [
      'workflows-empty-create aria-label',
      /aria-label="Workflow 作成フォームの『名前』入力欄にフォーカス"/,
    ],
    ['wf-edit aria-label', /aria-label=\{`Workflow「\$\{wf\.name\}」の graph \/ trigger を編集`\}/],
    [
      'wf-toggle aria-label (active)',
      /aria-label=\{[\s\S]+?`Workflow「\$\{wf\.name\}」を\$\{wf\.enabled \? '無効化' : '有効化'\}`/,
    ],
    [
      'wf-runs-toggle aria-label',
      /aria-label=\{[\s\S]+?`Workflow「\$\{wf\.name\}」の実行履歴 \(直近 5 件\) を表示`/,
    ],
    ['trigger preset manual aria-label', /aria-label="trigger を manual \(手動実行のみ\) に切替"/],
    [
      'editor dialog キャンセル aria-label',
      /aria-label=\{`Workflow「\$\{wf\.name\}」の編集をキャンセル`\}/,
    ],
  ]
  for (const [label, re] of labelChecks) {
    if (re.test(wp)) {
      findings.push({ level: 'info', message: `${label} 維持 OK` })
    } else {
      findings.push({ level: 'warning', message: `${label} 破壊` })
    }
  }

  // iter858 invariant: time-entry aria-hidden
  const cf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(cf)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: create-time-entry-form aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (workflows-panel-aria-hidden-iter859) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
