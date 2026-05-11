/**
 * Phase 6.15 loop iter 889 (mode-M Mobile audit — WCAG 2.5.8 AAA Target Size) —
 * 3 auth form (login / signup / mock-login) の Input height を h-8 (32px) → min-h-11 (44px) に拡張。
 *
 * 課題: shadcn Input は base class `h-8` (= 32px) で、mobile では WCAG 2.5.8 Min (24x24) は満たすが
 *   AAA (44x44) + iOS recommended (44pt) を下回る touch target。3 auth form (login 2 input +
 *   signup 3 input + mock-login 2 input = 7 input) は最頻 entry point なので mobile touch UX
 *   ここで底上げ。 shadcn Input 自体は編集禁止のため、IMEInput 利用箇所側で `className="min-h-11"`
 *   を渡し、Tailwind の min-height 規則で h-8 の 32px を 44px に底上げ (height = max(h-8, min-h-11))。
 *
 * fix (3 ファイル 7 行差分):
 *   - login-form 2 input
 *   - signup-form 3 input
 *   - mock-login-form 2 input
 *
 * 検証: source-side regex assert + iter888/887/851 invariant cross-check + Playwright で実測。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // login-form
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  const lfMin11 = (lf.match(/className="min-h-11"/g) ?? []).length
  if (lfMin11 >= 2) {
    findings.push({
      level: 'info',
      message: `login-form Input min-h-11 適用 OK (${lfMin11} 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `login-form Input min-h-11 件数 ${lfMin11} (期待 ≥2)`,
    })
  }

  // signup-form
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  const sfMin11 = (sf.match(/className="min-h-11"/g) ?? []).length
  if (sfMin11 >= 3) {
    findings.push({
      level: 'info',
      message: `signup-form Input min-h-11 適用 OK (${sfMin11} 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `signup-form Input min-h-11 件数 ${sfMin11} (期待 ≥3)`,
    })
  }

  // mock-login-form
  const ml = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  const mlMin11 = (ml.match(/className="min-h-11"/g) ?? []).length
  if (mlMin11 >= 2) {
    findings.push({
      level: 'info',
      message: `mock-login-form Input min-h-11 適用 OK (${mlMin11} 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-login-form Input min-h-11 件数 ${mlMin11} (期待 ≥2)`,
    })
  }

  // iter888 invariant
  if (/id="tsPassword-hint"[^>]*>\s*mock-timesheet 用パスワード/.test(ml)) {
    findings.push({
      level: 'info',
      message: `iter888 invariant: mock-login tsPassword-hint 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter888 invariant: 破壊` })
  }

  // iter887 invariant
  if (/8 文字以上。覚えやすいパスフレーズ推奨/.test(sf)) {
    findings.push({
      level: 'info',
      message: `iter887 invariant: signup-password-hint 拡充 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter887 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (auth-form-input-mobile-target-iter889) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
