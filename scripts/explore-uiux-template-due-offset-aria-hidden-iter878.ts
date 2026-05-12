/**
 * Phase 6.15 loop iter 878 (mode-D Desktop a11y) —
 * template-items-editor.tsx 期日 offset chip 内 visible "+N日" を aria-hidden
 * span で wrap (iter800-877 sweep の続編)。
 *
 * 課題: template-items-editor.tsx 行 217-222 の 期日 offset chip は aria-label
 *   "期日 offset +N 日" を持つのに、内側 visible "+N日" は aria-hidden 無し →
 *   SR で二重読み可能性。Template item 一覧の各行ごとに表示される頻出 chip。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "+{N}日" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/875/876/877 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\+\{it\.dueOffsetDays\}日<\/span>/.test(tie)) {
    findings.push({
      level: 'info',
      message: `iter878: template-items-editor 期日 offset chip aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter878: 期日 offset aria-hidden 不在`,
    })
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

  // iter876 invariant: dep-add aria-hidden 維持
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(idp)) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: dep-add aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter878) ===`)
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
