/**
 * Phase 6.15 loop iter 864 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * time-entry 系 3 button visible text を aria-hidden span に統合 + ASCII '...' → Unicode '…'
 *
 * 課題: 3 file 横断 time-entry button 残存:
 *   1. create-time-entry-form.tsx 171: visible "..." (ASCII) / "記録"、aria-label 完全 content
 *   2. time-entries-panel.tsx 64: 「作成フォームへ」 raw button (EmptyState focus jump)
 *   3. time-entries-table.tsx 141: 「再Sync / Sync」 (条件付き、aria-label 完全 content)
 *   1 番は visible "..." (ASCII 3 dots) で意味が無く、Unicode "…" にも統一する。
 *
 * fix (3 ファイル各 1 行差分):
 *   - create-time-entry-form: visible を <span aria-hidden="true">{… : '記録'}</span> 化、ASCII を Unicode 統一
 *   - time-entries-panel: 「作成フォームへ」 を span 化
 *   - time-entries-table: 「再Sync/Sync」 を span 化 (条件付き)
 *
 * 検証: source-side regex assert + iter863/862/861/860/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // create-time-entry-form
  const ctf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '…' : '記録'\}<\/span>/.test(ctf)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-form 「記録」 submit aria-hidden span 統合 + Unicode '…' OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-form 「記録」 submit 未統合`,
    })
  }
  // ASCII '...' が残っていないこと
  if (/'\.\.\.'/.test(ctf)) {
    findings.push({
      level: 'warning',
      message: `create-time-entry-form ASCII '...' 残存`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `create-time-entry-form ASCII '...' 残存 0 件 OK`,
    })
  }

  // time-entries-panel EmptyState
  const tep = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tep)) {
    findings.push({
      level: 'info',
      message: `time-entries-panel 「作成フォームへ」 EmptyState aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entries-panel 「作成フォームへ」 未統合`,
    })
  }

  // time-entries-table Sync button
  const tet = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}<\/span>/.test(tet)
  ) {
    findings.push({
      level: 'info',
      message: `time-entries-table 「再Sync/Sync」 button aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entries-table 「再Sync/Sync」 未統合`,
    })
  }

  // iter863 invariant: WorkflowEditorDialog
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">manual<\/span>/.test(wp) &&
    /<span aria-hidden="true">\{saving \? '保存中…' : '保存'\}<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: WorkflowEditorDialog 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant: 破壊` })
  }

  // iter860 invariant
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: templates-panel 作成フォームへ 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
  }

  // iter851 invariant
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

  console.log(`\n=== Findings (time-entry-buttons-aria-hidden-iter864) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
