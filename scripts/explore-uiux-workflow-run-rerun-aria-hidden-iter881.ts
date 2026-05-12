/**
 * Phase 6.15 loop iter 881 (mode-D Desktop a11y) —
 * workflows-panel.tsx WorkflowRunHistory 再実行 button 内 visible "再" を
 * aria-hidden span で wrap (iter800-880 sweep の続編)。
 *
 * 課題: workflows-panel.tsx 行 809 の wf-run-rerun button は aria-label が完全
 *   content (実行 id + 動作 + pending) を含むのに、内側 visible "再" は
 *   aria-hidden 無し → SR で二重読み可能性。Workflow run history の各 run 行
 *   ごとに表示される頻出 button。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "再" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/878/879/880 invariant cross-check。
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
  if (/<span aria-hidden="true">再<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter881: workflow run-rerun button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter881: rerun button aria-hidden 不在`,
    })
  }

  // iter880 invariant: workflow editor + empty button aria-hidden 維持
  if (
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(wp) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(wp) &&
    /<span aria-hidden="true">\{saving \? '保存中…' : '保存'\}<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter880 invariant: workflow editor + empty button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter880 invariant: 破壊` })
  }

  // iter879 invariant: templates 2 CTA aria-hidden 維持
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter879 invariant: templates 作成 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter879 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter881) ===`)
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
