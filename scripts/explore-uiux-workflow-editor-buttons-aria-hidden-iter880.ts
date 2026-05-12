/**
 * Phase 6.15 loop iter 880 (mode-D Desktop a11y) —
 * workflows-panel.tsx empty state CTA + DialogFooter 2 button 内 visible を
 * aria-hidden span で wrap (iter800-879 sweep の続編、Workflow panel 残 button)。
 *
 * 課題:
 *   1. workflows-empty-create button (作成フォームへ) は aria-label を持つのに
 *      visible "作成フォームへ" は aria-hidden 無し
 *   2. wf-editor-cancel "キャンセル" は aria-label を持つのに aria-hidden 無し
 *   3. wf-editor-save "保存中…/保存" も同 pattern
 *
 * fix (1 ファイル ~3 行差分): 各 button の visible を aria-hidden span で wrap。
 *
 * 検証: source-side regex assert + iter735/877/878/879 invariant cross-check。
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
  const emptyCreateHidden = /<span aria-hidden="true">作成フォームへ<\/span>/.test(wp)
  const editorCancelHidden = /<span aria-hidden="true">キャンセル<\/span>/.test(wp)
  const editorSaveHidden = /<span aria-hidden="true">\{saving \? '保存中…' : '保存'\}<\/span>/.test(
    wp,
  )
  if (emptyCreateHidden && editorCancelHidden && editorSaveHidden) {
    findings.push({
      level: 'info',
      message: `iter880: workflows-panel empty + editor 2 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter880: 不完全 (empty=${emptyCreateHidden} cancel=${editorCancelHidden} save=${editorSaveHidden})`,
    })
  }

  // iter879 invariant: templates 2 CTA aria-hidden 維持
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  const ifm = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">作成<\/span>/.test(tp) &&
    /<span aria-hidden="true">\{mut\.isPending \? '展開中\.\.\.' : '即実行 \(Instantiate\)'\}<\/span>/.test(
      ifm,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter879 invariant: templates 2 CTA aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter879 invariant: 破壊` })
  }

  // iter878 invariant: template-items-editor 期日 offset aria-hidden 維持
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\+\{it\.dueOffsetDays\}日<\/span>/.test(tie)) {
    findings.push({
      level: 'info',
      message: `iter878 invariant: template-items-editor 期日 offset aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter878 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter880) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
