/**
 * Phase 6.15 loop iter 870 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * bulk-action-bar.tsx の status 変更 + 選択解除 2 button visible text を aria-hidden span に統合。
 *
 * 課題: iter850 で 削除 button は span 化済 + iter850 alt で aria-label を WCAG 2.5.3 適合済 だが、
 *   同 file 内に他に visible aria-hidden 抜け 2 件残存:
 *   1. ステータス変更 button (`{s.label} に`、dynamic、status 種別ごと)
 *   2. 選択解除「解除」 button
 *   両 aria-label 完全 content (件数 + status label / 操作) を含むのに visible に aria-hidden 無し。
 *
 * fix (1 ファイル 2 箇所差分):
 *   - 2 visible text を <span aria-hidden="true"> で wrap (status 変更は dynamic 含む)
 *
 * 検証: source-side regex assert + iter850 削除 invariant + iter869/868/867/865 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )

  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-action-bar status 変更「{label} に」 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-action-bar status 変更「{label} に」 未統合`,
    })
  }
  if (/<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-action-bar 選択解除「解除」 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `bulk-action-bar 選択解除「解除」 未統合` })
  }
  // iter850 invariant: 削除 button + label-in-name aria-label
  if (
    /<span aria-hidden="true">削除<\/span>/.test(bab) &&
    /aria-label=\{[\s\S]*選択 \$\{count\} 件を削除 \(soft delete: ゴミ箱で 30 日保持\)/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: 削除 span + label-in-name 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  // iter869 invariant
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter869 invariant: item-edit-dialog アーカイブ button 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter869 invariant: 破壊` })
  }

  // iter868 invariant
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\{create\.isPending \? '追加中…' : `\$\{pendingTitleCount\} 件追加`\}\s*<\/span>/s.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: subtasks-panel bulk-add 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
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

  console.log(`\n=== Findings (bulk-action-bar-status-and-clear-aria-hidden-iter870) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
