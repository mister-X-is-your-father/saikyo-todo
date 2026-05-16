/**
 * Phase 6.15 loop iter 892 (mode-M Mobile a11y) —
 * 残 h-9 element 4 個 (integrations-panel src-kind/src-method + template-items-editor
 * dueOffset + sprint-defaults-length) を min-h-11 に変更 (mobile tap target 44x44 適合)。
 *
 * 経緯: iter888-891 続編。残 h-9 element を min-h-11 化し、mobile mode 適合 close to 完成。
 *
 * 修正: 4 element に min-h-11 適用
 *   - integrations-panel: src-kind + src-method 2 select ("h-9 w-full ..." → "min-h-11 ...")
 *   - template-items-editor: dueOffset input ("h-9 w-28 ..." → "min-h-11 ...")
 *   - sprints-panel: sprint-defaults-length input ("h-9 w-20 text-sm" → "min-h-11 ...")
 *
 * 検証: source-side regex assert + iter735/843/849-891 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. integrations-panel 2 select min-h-11 (replaceAll で 2 箇所同時)
  const ipMinH11 = (ip.match(/min-h-11 w-full rounded-md border px-3 py-1 text-sm/g) ?? []).length
  if (ipMinH11 >= 2) {
    findings.push({
      level: 'info',
      message: `integrations-panel src-kind + src-method min-h-11 OK (${ipMinH11} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel min-h-11 不足 (現在 ${ipMinH11}、期待 2)`,
    })
  }

  // 2. template-items-editor dueOffset min-h-11
  if (/className="min-h-11 w-28 rounded-md border px-2 text-sm"/.test(tie)) {
    findings.push({
      level: 'info',
      message: `template-items-editor dueOffset min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor dueOffset min-h-11 未統合`,
    })
  }

  // 3. sprints-panel sprint-defaults-length min-h-11
  if (
    /<Input[\s\S]+?id="sprint-defaults-length"[\s\S]+?className="min-h-11 w-20 text-sm"/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-defaults-length min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-defaults-length min-h-11 未統合`,
    })
  }

  // 4. iter891 invariant: 3 misc selects
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/min-h-11 rounded border bg-transparent px-1 py-0\.5 text-xs/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter891 invariant: gantt-zoom min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter891 invariant: 破壊` })
  }

  // shadcn UI 編集なし
  const inputUi = readFileSync(resolve(process.cwd(), 'src/components/ui/input.tsx'), 'utf8')
  if (/h-8/.test(inputUi)) {
    findings.push({
      level: 'info',
      message: `shadcn Input default h-8 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `shadcn Input 編集された` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mobile-residual-h9-h11-iter892) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
