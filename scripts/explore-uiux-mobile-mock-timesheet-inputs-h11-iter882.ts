/**
 * Phase 6.15 loop iter 882 (mode-M Mobile a11y) —
 * mock-timesheet 2 form (login / submit) IMEInput 5 個に className="h-11" 追加
 * (mobile tap target 44x44 適合)。
 *
 * 経緯: iter881 続編。iPhone 13 emulation で /mock-timesheet/login audit、
 *   tsEmail / tsPassword 342x32 (height < 44) 検出。同 form 群 (mock-login-form +
 *   mock-submit-form) 全 IMEInput に className="h-11" 追加で統一。
 *
 * 修正: 5 input (mock-login: tsEmail / tsPassword + mock-submit: tsDate / tsDescription /
 *   tsHours) に className="h-11" 追加。runtime verify (iPhone 13 emulation) で
 *   tsEmail/tsPassword 342x44 確認済。
 *
 * 検証: source-side regex assert + runtime verify (browser で h=44 確認済) +
 *       iter735/843/849-881 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const mlf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )

  // 1. mock-login-form 2 input className="h-11"
  const mlfH11 = (mlf.match(/className="h-11"/g) ?? []).length
  if (mlfH11 >= 2) {
    findings.push({
      level: 'info',
      message: `mock-login-form 2 IMEInput className="h-11" 追加 OK (${mlfH11} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-login-form className="h-11" 不足 (現在 ${mlfH11}、期待 2)`,
    })
  }

  // 2. mock-submit-form 3 input className="h-11"
  const msfH11 = (msf.match(/className="h-11"/g) ?? []).length
  if (msfH11 >= 3) {
    findings.push({
      level: 'info',
      message: `mock-submit-form 3 IMEInput className="h-11" 追加 OK (${msfH11} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit-form className="h-11" 不足 (現在 ${msfH11}、期待 3)`,
    })
  }

  // 3. iter881 invariant: auth pages 5 input h-11
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  const lfH11 = (lf.match(/className="h-11"/g) ?? []).length
  const sfH11 = (sf.match(/className="h-11"/g) ?? []).length
  if (lfH11 >= 2 && sfH11 >= 3) {
    findings.push({
      level: 'info',
      message: `iter881 invariant: auth pages 5 input h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter881 invariant: 破壊` })
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

  console.log(`\n=== Findings (mobile-mock-timesheet-inputs-h11-iter882) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
