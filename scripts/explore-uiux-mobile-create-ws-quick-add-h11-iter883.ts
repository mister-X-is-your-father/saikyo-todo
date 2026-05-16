/**
 * Phase 6.15 loop iter 883 (mode-M Mobile a11y) —
 * create-workspace-form 2 input + quick-add 1 input に className="h-11" 追加
 * (mobile tap target 44x44 適合、頻繁 entry point の input 統一)。
 *
 * 経緯: iter881/882 続編。auth + mock-timesheet form の input h-11 化済 →
 *   workspace 内 frequently-used 2 form (create-workspace-form 2 input + quick-add 1 input)
 *   も同 pattern で統一。QuickAdd は workspace home の最頻 entry point。
 *
 * 修正: 3 input (ws-name / ws-slug / quick-add-input) に className="h-11" 追加。
 *
 * 検証: source-side regex assert + iter735/843/849-882 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')

  // 1. create-workspace-form 2 IMEInput className="h-11"
  const cwfH11 = (cwf.match(/className="h-11"/g) ?? []).length
  if (cwfH11 >= 2) {
    findings.push({
      level: 'info',
      message: `create-workspace-form 2 IMEInput className="h-11" 追加 OK (${cwfH11} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace-form className="h-11" 不足 (現在 ${cwfH11}、期待 2)`,
    })
  }

  // 2. quick-add 1 IMEInput className に h-11 統合 (元 className="flex-1" に併合)
  if (/className="h-11 flex-1"/.test(qa)) {
    findings.push({
      level: 'info',
      message: `quick-add input className="h-11 flex-1" 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add input className 統合 未完了`,
    })
  }

  // 3. iter881/882 invariant: auth + mock-timesheet h-11
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  const mlf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  const lfH11 = (lf.match(/className="h-11"/g) ?? []).length
  const sfH11 = (sf.match(/className="h-11"/g) ?? []).length
  const mlfH11 = (mlf.match(/className="h-11"/g) ?? []).length
  const msfH11 = (msf.match(/className="h-11"/g) ?? []).length
  if (lfH11 >= 2 && sfH11 >= 3 && mlfH11 >= 2 && msfH11 >= 3) {
    findings.push({
      level: 'info',
      message: `iter881/882 invariant: auth + mock-timesheet h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter881/882 invariant: 破壊` })
  }

  // 4. shadcn UI 直接編集なし
  const inputUi = readFileSync(resolve(process.cwd(), 'src/components/ui/input.tsx'), 'utf8')
  if (/h-8/.test(inputUi)) {
    findings.push({
      level: 'info',
      message: `shadcn Input default h-8 維持 (UI 編集禁止 invariant 維持) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `shadcn Input default 編集された可能性`,
    })
  }

  // iter880 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (/focus:min-h-11/.test(layout) && /focus:min-w-11/.test(layout)) {
    findings.push({
      level: 'info',
      message: `iter880 invariant: skip link tap target 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter880 invariant: 破壊` })
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

  console.log(`\n=== Findings (mobile-create-ws-quick-add-h11-iter883) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
