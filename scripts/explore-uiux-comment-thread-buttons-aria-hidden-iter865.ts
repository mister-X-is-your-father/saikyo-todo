/**
 * Phase 6.15 loop iter 865 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * comment-thread.tsx の 4 button (キャンセル / 保存 / 編集 / 削除) visible text を aria-hidden span に統合。
 *
 * 課題: コメント編集 / 操作 4 button:
 *   1. キャンセル (編集モード cancel)
 *   2. 保存 / 保存中… (編集 save 条件付き)
 *   3. 編集 (raw button、entry edit-mode 入り)
 *   4. 削除 (raw button、softDelete)
 *   全 aria-label が完全 content (コメント本文プレビュー + 操作) を含むのに visible に
 *   aria-hidden 無し → SR 再 announce、Item 編集 dialog 内 thread で頻繁。
 *
 * fix (1 ファイル 4 行差分):
 *   - 4 visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter864/863/862/861/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )

  const checks: Array<[RegExp, string]> = [
    [/<span aria-hidden="true">キャンセル<\/span>/, 'キャンセル (編集 cancel)'],
    [
      /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/,
      '保存 (編集 save 条件付き)',
    ],
    [/<span aria-hidden="true">編集<\/span>/, '編集 (entry edit-mode 入り)'],
    [/<span aria-hidden="true">削除<\/span>/, '削除 (softDelete)'],
  ]

  for (const [re, label] of checks) {
    if (re.test(ct)) {
      findings.push({ level: 'info', message: `comment-thread "${label}" aria-hidden 統合 OK` })
    } else {
      findings.push({ level: 'warning', message: `comment-thread "${label}" 未統合` })
    }
  }

  // iter864 invariant
  const ctf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '…' : '記録'\}<\/span>/.test(ctf)) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: create-time-entry-form 「記録」 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
  }

  // iter863 invariant
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">manual<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: WorkflowEditorDialog manual 維持 OK`,
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

  console.log(`\n=== Findings (comment-thread-buttons-aria-hidden-iter865) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
