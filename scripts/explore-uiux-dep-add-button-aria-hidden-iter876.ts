/**
 * Phase 6.15 loop iter 876 (mode-D Desktop a11y) —
 * item-dependencies-panel.tsx 依存追加 button 内 visible "追加" / "追加中…" を
 * aria-hidden span で wrap (iter800-875 sweep の続編)。
 *
 * 課題: item-dependencies-panel.tsx 行 248 の dep-add Button は aria-label が
 *   完全 content (依存追加状態 / 不能理由 / pending) を含むのに、内側 visible
 *   "追加" / "追加中…" は aria-hidden 無し → SR で二重読み可能性。Item edit
 *   dialog 依存追加 group の主要 CTA。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "{add.isPending ? '追加中…' : '追加'}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/873/874/875 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(idp)) {
    findings.push({
      level: 'info',
      message: `iter876: item-dependencies-panel 追加 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter876: dep-add aria-hidden 不在`,
    })
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

  // iter874 invariant: budget-panel aria-hidden 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">上限を変更<\/span>/.test(bp)) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: budget-panel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter876) ===`)
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
