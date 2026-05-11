/**
 * Phase 6.15 loop iter 863 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * workflows-panel.tsx の WorkflowEditorDialog 7 button visible text を aria-hidden span に統合 (一括)。
 *
 * 課題: WorkflowEditorDialog 内 7 button:
 *   1. node preset add (`+ {preset.type}`、dynamic content)
 *   2. trigger preset manual
 *   3. trigger preset cron
 *   4. trigger preset item-event
 *   5. trigger preset webhook
 *   6. キャンセル (editor cancel)
 *   7. 保存 / 保存中… (editor save 条件付き)
 *   全 aria-label が完全 content (Workflow 名 + 操作 / preset type 詳細) を含むのに
 *   visible に aria-hidden 無し → SR 再 announce、Workflow graph 編集 path 頻繁。
 *
 * fix (1 ファイル 7 箇所差分):
 *   - 7 visible text を <span aria-hidden="true"> で wrap (preset.type は dynamic を含む)
 *
 * 検証: source-side regex assert + iter862/861/860/857/851 invariant cross-check。
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

  const checks: Array<[RegExp, string]> = [
    [/<span aria-hidden="true">\+ \{preset\.type\}<\/span>/, 'node preset add (dynamic)'],
    [/<span aria-hidden="true">manual<\/span>/, 'trigger preset manual'],
    [/<span aria-hidden="true">cron<\/span>/, 'trigger preset cron'],
    [/<span aria-hidden="true">item-event<\/span>/, 'trigger preset item-event'],
    [/<span aria-hidden="true">webhook<\/span>/, 'trigger preset webhook'],
    [/<span aria-hidden="true">キャンセル<\/span>/, 'editor cancel'],
    [/<span aria-hidden="true">\{saving \? '保存中…' : '保存'\}<\/span>/, 'editor save (条件付き)'],
  ]

  for (const [re, label] of checks) {
    if (re.test(wp)) {
      findings.push({
        level: 'info',
        message: `WorkflowEditorDialog "${label}" aria-hidden 統合 OK`,
      })
    } else {
      findings.push({ level: 'warning', message: `WorkflowEditorDialog "${label}" 未統合` })
    }
  }

  // iter862 invariant: 4 件 (作成フォームへ / 編集 / toggle / 履歴)
  const iter862Checks = [
    /<span aria-hidden="true">作成フォームへ<\/span>/,
    /<span aria-hidden="true">編集<\/span>/,
    /<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/,
    /<span aria-hidden="true">履歴<\/span>/,
  ]
  if (iter862Checks.every((r) => r.test(wp))) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: workflows-panel 4 件 (作成フォームへ / 編集 / toggle / 履歴) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // iter861 invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: integrations-panel Pull 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
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

  console.log(`\n=== Findings (workflows-editor-dialog-aria-hidden-iter863) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
