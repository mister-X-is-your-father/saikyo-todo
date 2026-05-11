/**
 * Phase 6.15 loop iter 869 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * item-edit-dialog.tsx の DialogFooter 4 button (unarchive / archive / baseline 記録-更新 / baseline クリア)
 * visible text を aria-hidden span に統合 (一括)。
 *
 * 課題: Item 編集 dialog の Footer 4 button:
 *   1. アーカイブ復元 / 復元中… (unarchive 条件付き)
 *   2. アーカイブ / アーカイブ中… (archive 条件付き)
 *   3. ベースライン記録 / 更新 / 記録中… (setBaseline 3 状態)
 *   4. baseline クリア / クリア中… (clearBaseline 条件付き)
 *   全 aria-label 完全 content (Item title + 操作 + baseline 詳細) 包含だが visible に
 *   aria-hidden 無し → SR 再 announce、Item 編集の頻繁な lifecycle 操作で文言摩擦。
 *   既存 invariant: キャンセル / 保存 / Template として保存 (iter863-867 で span 化済) は維持。
 *
 * fix (1 ファイル 4 箇所差分):
 *   - 4 visible text を <span aria-hidden="true"> で wrap (うち 1 件は 3 状態 multiline 条件式)
 *
 * 検証: source-side regex assert + iter868/867/865/843 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  const checks: Array<[RegExp, string]> = [
    [
      /<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}<\/span>/,
      'アーカイブ復元 (条件付き)',
    ],
    [
      /<span aria-hidden="true">\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}<\/span>/,
      'アーカイブ (条件付き)',
    ],
    [
      /<span aria-hidden="true">\s*\{setBaseline\.isPending\s*\?\s*'記録中…'\s*:\s*item\.baselineStartDate\s*\?\s*'ベースライン更新'\s*:\s*'ベースライン記録'\}\s*<\/span>/,
      'ベースライン記録/更新/記録中… (3 状態)',
    ],
    [
      /<span aria-hidden="true">\{clearBaseline\.isPending \? 'クリア中…' : 'baseline クリア'\}<\/span>/,
      'baseline クリア (条件付き)',
    ],
  ]

  for (const [re, label] of checks) {
    if (re.test(ied)) {
      findings.push({
        level: 'info',
        message: `item-edit-dialog Footer "${label}" aria-hidden 統合 OK`,
      })
    } else {
      findings.push({ level: 'warning', message: `item-edit-dialog Footer "${label}" 未統合` })
    }
  }

  // 既存 invariant: 保存 (iter855) + キャンセル + Template として保存
  if (
    /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(ied) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(ied) &&
    /<span aria-hidden="true">\s*\{createTemplateFromItem\.isPending \? '保存中…' : 'Template として保存'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter855/既存 invariant: 保存 / キャンセル / Template として保存 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855/既存 invariant: 破壊` })
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
      message: `iter868 invariant: subtasks-panel bulk-add aria-hidden 維持 OK`,
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

  console.log(`\n=== Findings (item-edit-dialog-footer-aria-hidden-iter869) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
