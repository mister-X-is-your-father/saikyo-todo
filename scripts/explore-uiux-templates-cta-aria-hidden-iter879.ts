/**
 * Phase 6.15 loop iter 879 (mode-D Desktop a11y) —
 * templates-panel + instantiate-form の 2 CTA button 内 visible を aria-hidden
 * span で wrap (iter800-878 sweep の続編、Template workflow 完結 sweep)。
 *
 * 課題:
 *   1. templates-panel.tsx 行 204 の Template 作成 submit Button は aria-label
 *      が完全 content を含むのに visible "作成" は aria-hidden 無し
 *   2. instantiate-form.tsx 行 152 の 即実行 (Instantiate) Button も同 pattern
 *
 * fix (2 ファイル ~2 行差分): 各 button の visible を aria-hidden span で wrap。
 *
 * 検証: source-side regex assert + iter735/876/877/878 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  const tpHidden = /<span aria-hidden="true">作成<\/span>/.test(tp)
  const ifm = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  const ifmHidden =
    /<span aria-hidden="true">\{mut\.isPending \? '展開中\.\.\.' : '即実行 \(Instantiate\)'\}<\/span>/.test(
      ifm,
    )
  if (tpHidden && ifmHidden) {
    findings.push({
      level: 'info',
      message: `iter879: templates-panel 作成 + instantiate-form 即実行 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter879: 不完全 (templates 作成=${tpHidden} instantiate=${ifmHidden})`,
    })
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

  // iter877 invariant: today-empty-quick-add aria-hidden 維持
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter877 invariant: today-empty-quick-add aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter877 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter879) ===`)
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
