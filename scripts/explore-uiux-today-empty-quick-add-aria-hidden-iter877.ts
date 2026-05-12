/**
 * Phase 6.15 loop iter 877 (mode-D Desktop a11y) —
 * today-view.tsx empty 状態の「クイック追加にフォーカス (キー: q)」button 内
 * visible を aria-hidden span で wrap (iter800-876 sweep の続編)。
 *
 * 課題: today-view.tsx 行 149-162 の today-empty-quick-add button は aria-label
 *   "クイック追加入力欄にフォーカス (q キーでも可)" を持つのに、内側 visible
 *   "クイック追加にフォーカス (キー: q)" は aria-hidden 無し → SR で二重読み
 *   可能性。Today view が空のときに表示される empty state の唯一 CTA。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/874/875/876 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter877: today-empty-quick-add button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter877: today-empty-quick-add aria-hidden 不在`,
    })
  }

  // iter876 invariant: dep-add button aria-hidden 維持
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(idp)) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: dep-add button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: 破壊` })
  }

  // iter875 invariant: sprint-defaults 編集 aria-hidden 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">編集<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter875 invariant: sprint-defaults 編集 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter875 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter877) ===`)
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
