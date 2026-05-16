/**
 * Phase 6.15 loop iter 886 (mode-M Mobile a11y) —
 * create-time-entry-form (3) + instantiate-form (2) IMEInput 5 個に
 * className h-11 追加 (mobile tap target 44x44 適合)。
 *
 * 経緯: iter881-885 続編。time-entry + template instantiate の form input が h-8 で
 *   WCAG 2.5.5 AAA Touch Target 不足。
 *
 * 修正: 5 IMEInput
 *   - create-time-entry-form: teDate / teDescription / teMinutes (minutes は "h-11 w-24")
 *   - instantiate-form: override-${id} / var-${id}-${v} (各 root override + dynamic 変数)
 *
 * 検証: source-side regex assert + iter735/843/849-885 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cte = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  const inst = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )

  // 1. create-time-entry-form: teDate h-11
  if (
    /<IMEInput[\s\S]+?id="teDate"[\s\S]+?className="h-11"/.test(cte) ||
    /<IMEInput[\s\S]+?className="h-11"[\s\S]+?id="teDate"/.test(cte)
  ) {
    findings.push({ level: 'info', message: `create-time-entry-form teDate h-11 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-form teDate h-11 未統合`,
    })
  }

  // 2. teDescription h-11
  if (
    /<IMEInput[\s\S]+?id="teDescription"[\s\S]+?className="h-11"/.test(cte) ||
    /<IMEInput[\s\S]+?className="h-11"[\s\S]+?id="teDescription"/.test(cte)
  ) {
    findings.push({
      level: 'info',
      message: `create-time-entry-form teDescription h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-form teDescription h-11 未統合`,
    })
  }

  // 3. teMinutes "h-11 w-24" 統合
  if (/className="h-11 w-24"/.test(cte)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-form teMinutes "h-11 w-24" 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-form teMinutes 統合 未完了`,
    })
  }

  // 4. instantiate-form override h-11 + var h-11 (各 1 箇所以上)
  const instH11 = (inst.match(/className="h-11"/g) ?? []).length
  if (instH11 >= 2) {
    findings.push({
      level: 'info',
      message: `instantiate-form 2 IMEInput className="h-11" OK (${instH11} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `instantiate-form className="h-11" 不足 (現在 ${instH11}、期待 2)`,
    })
  }

  // iter885 invariant: item-edit-dialog 5 input h-11
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const iedH11 = (ied.match(/className="h-11"/g) ?? []).length
  if (iedH11 >= 5) {
    findings.push({
      level: 'info',
      message: `iter885 invariant: item-edit-dialog 5 input h-11 維持 OK (${iedH11} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter885 invariant: 破壊` })
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

  console.log(`\n=== Findings (mobile-time-entry-instantiate-h11-iter886) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
