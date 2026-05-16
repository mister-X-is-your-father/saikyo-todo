/**
 * Phase 6.15 loop iter 887 (mode-M Mobile a11y) —
 * decompose-proposals-panel の編集 form 内 2 IMEInput (p-title / p-dod) に
 * className h-11 追加 (mobile tap target 44x44 適合)。
 *
 * 経緯: iter881-886 続編。decompose-proposals-panel の各 提案編集 form の input が h-8 で
 *   WCAG 2.5.5 AAA Touch Target 不足 → 2 IMEInput に className="h-11" 追加で 44x44 適合。
 *
 * 修正: 2 IMEInput
 *   - p-title-${proposal.id} (提案タイトル)
 *   - p-dod-${proposal.id} (提案 DoD、MUST 時のみ表示)
 *
 * 備考: sprint-edit-start/end-${id} は className="h-8 text-xs" で意図的に小さく密な dense
 *   edit form のため、本 iter では対象外 (UX 設計上の trade-off)。
 *
 * 検証: source-side regex assert + iter735/843/849-886 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. p-title-${proposal.id} h-11
  if (
    /<IMEInput[\s\S]+?id=\{`p-title-\$\{proposal\.id\}`\}[\s\S]+?className="h-11"/.test(dpp) ||
    /<IMEInput[\s\S]+?className="h-11"[\s\S]+?id=\{`p-title-\$\{proposal\.id\}`\}/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals p-title h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals p-title h-11 未統合`,
    })
  }

  // 2. p-dod-${proposal.id} h-11
  if (
    /<IMEInput[\s\S]+?id=\{`p-dod-\$\{proposal\.id\}`\}[\s\S]+?className="h-11"/.test(dpp) ||
    /<IMEInput[\s\S]+?className="h-11"[\s\S]+?id=\{`p-dod-\$\{proposal\.id\}`\}/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals p-dod h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals p-dod h-11 未統合`,
    })
  }

  // 3. iter858 invariant: 4 button aria-hidden 維持
  if (
    /<span aria-hidden="true">中止<\/span>/.test(dpp) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: decompose-proposals 残 4 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter886 invariant: time-entry + instantiate h-11
  const cte = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  const inst = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  const cteH11 = (cte.match(/className="h-11"/g) ?? []).length
  const instH11 = (inst.match(/className="h-11"/g) ?? []).length
  if (cteH11 >= 2 && /className="h-11 w-24"/.test(cte) && instH11 >= 2) {
    findings.push({
      level: 'info',
      message: `iter886 invariant: time-entry + instantiate h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter886 invariant: 破壊` })
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

  console.log(`\n=== Findings (mobile-decompose-proposals-h11-iter887) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
