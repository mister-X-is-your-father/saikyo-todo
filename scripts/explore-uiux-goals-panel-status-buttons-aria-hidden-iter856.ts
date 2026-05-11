/**
 * Phase 6.15 loop iter 856 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * goals-panel.tsx の Goal status 遷移 5 button visible text を aria-hidden span に統合 (一括)。
 *
 * 課題: src/components/workspace/goals-panel.tsx の Goal カード status 操作群 5 button
 *   (完了 / アーカイブ x2 / active に戻す x2) は全て aria-label が完全 content を含むのに
 *   visible text に aria-hidden 無し → 一部 SR で再 announce される anti-pattern
 *   (iter826/iter844-855 の visible aria-hidden 統一規約に未追従)。
 *   Goal status 操作は OKR cycle で頻繁、status 切替時の SR 文言摩擦をここで除く。
 *
 * fix (1 ファイル 5 行差分、span aria-hidden で wrap):
 *   - 完了 (status='active' → 完了)
 *   - アーカイブ x2 (status='active' / 'completed' → archived)
 *   - active に戻す x2 (status='completed' / 'archived' → active)
 *
 * 検証: source-side regex assert + iter855/854/853/851/735 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. 完了 (1 件)
  if ((gp.match(/<span aria-hidden="true">完了<\/span>/g) ?? []).length === 1) {
    findings.push({
      level: 'info',
      message: `goals-panel "完了" button aria-hidden 統合 OK (1 件)`,
    })
  } else {
    findings.push({ level: 'warning', message: `goals-panel "完了" 件数異常` })
  }

  // 2. アーカイブ (2 件)
  const archCount = (gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []).length
  if (archCount === 2) {
    findings.push({
      level: 'info',
      message: `goals-panel "アーカイブ" button aria-hidden 統合 OK (2 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel "アーカイブ" aria-hidden 件数 ${archCount} (期待 2)`,
    })
  }

  // 3. active に戻す (2 件)
  const reactCount = (gp.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? []).length
  if (reactCount === 2) {
    findings.push({
      level: 'info',
      message: `goals-panel "active に戻す" button aria-hidden 統合 OK (2 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel "active に戻す" aria-hidden 件数 ${reactCount} (期待 2)`,
    })
  }

  // 旧 raw text が残っていないこと (Button 直下、span 外側)
  const rawComplete = /\}\s*\n\s*>\n\s*完了\n\s*<\/Button>/g
  const rawArchive = /\}\s*\n\s*>\n\s*アーカイブ\n\s*<\/Button>/g
  const rawReactivate = /\}\s*\n\s*>\n\s*active に戻す\n\s*<\/Button>/g
  if (
    (gp.match(rawComplete) ?? []).length === 0 &&
    (gp.match(rawArchive) ?? []).length === 0 &&
    (gp.match(rawReactivate) ?? []).length === 0
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel raw text Button 直下 残存 0 件 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel raw text Button 直下 残存`,
    })
  }

  // iter855 invariant: pending state Unicode 統一 (item-edit-dialog 保存中…)
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: item-edit-dialog 保存中… 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant (item-edit-dialog): 破壊` })
  }

  // iter854 invariant: 読み込み中… (async-states default)
  const as = readFileSync(resolve(process.cwd(), 'src/components/shared/async-states.tsx'), 'utf8')
  if (/message\s*=\s*'読み込み中…'/.test(as)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: async-states default 読み込み中… 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
  }

  // iter853 invariant: offline retry button aria-hidden
  const rb = readFileSync(resolve(process.cwd(), 'src/app/~offline/retry-button.tsx'), 'utf8')
  if (/<span aria-hidden="true">再読み込みして再試行<\/span>/.test(rb)) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: offline retry button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // iter851 invariant: skip-link focus min-h-11
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
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

  console.log(`\n=== Findings (goals-panel-status-buttons-aria-hidden-iter856) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
