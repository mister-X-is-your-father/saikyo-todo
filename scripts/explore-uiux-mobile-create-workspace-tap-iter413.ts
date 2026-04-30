/**
 * Phase 6.15 loop iter 413 (mode-M Mobile audit) — CreateWorkspaceForm
 * 作成 button を 44x44 tap target に拡大 (iter408+409+410 horizontal
 * expansion で 6 form sweep 達成)。
 *
 * 課題: src/components/workspace/create-workspace-form.tsx の <Button
 *   type="submit" className="w-full"> は shadcn default h-8 = 32px を
 *   継承し mobile WCAG 2.5.5 違反。iter408 (/~offline) + iter409 (auth) +
 *   iter410 (mock-timesheet) で 5 form の submit button を h-11 に
 *   揃えたが workspace 初回 onboarding form は未対応で UX 断絶。
 *
 *   workspace 初回 onboarding は app の最 critical path (account 作成後
 *   workspace を作らないと何もできない)、submit ミスタップは UX 致命的。
 *
 * fix: 1 file × 1 line 差替 (className="w-full" → "h-11 w-full")。
 *
 *   結果: button 44px tall。既存 iter377 (onInvalid) / iter402
 *   (enterKeyHint) 維持。これで iter408+409+410+413 で **6 form (login /
 *   signup / mock-login / mock-submit / offline retry / create-workspace)
 *   の submit button が 44x44 tap target 統一達成**、unauth-onboarding
 *   フローの mobile UX 完備。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。視覚的 layout 不変
 * (button が高くなる以外)。
 *
 * 検証: source-side regex assert で codify (workspace 初回 onboarding は
 *   cloud env で auth 必須、static audit で代替)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/create-workspace-form.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. Button has h-11 w-full
  const submitMatch = src.match(/<Button type="submit"[\s\S]*?<\/Button>/)
  if (!submitMatch) {
    findings.push({ level: 'warning', message: `${path}: submit Button block 不在` })
  } else if (!/className="h-11 w-full"/.test(submitMatch[0])) {
    findings.push({
      level: 'warning',
      message: `${path}: submit Button に className="h-11 w-full" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${path}: h-11 w-full OK` })
  }

  // iter377 invariant 維持: handleSubmit(onSubmit, onInvalid)
  if (!/handleSubmit\(onSubmit,\s*onInvalid\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${path}: iter377 onInvalid wire up が消えた (regression)`,
    })
  }

  // iter402 invariant 維持: enterKeyHint
  if (!/enterKeyHint="next"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${path}: iter402 name enterKeyHint が消えた (regression)`,
    })
  }

  // iter408+409+410 invariant 維持: 5 form の h-11 が消えていない
  for (const [p, sel] of [
    ['src/app/~offline/retry-button.tsx', /className="h-11 px-4"/],
    ['src/components/auth/login-form.tsx', /className="h-11 w-full"/],
    ['src/components/auth/signup-form.tsx', /className="h-11 w-full"/],
    ['src/components/mock-timesheet/mock-login-form.tsx', /className="h-11 w-full"/],
    ['src/components/mock-timesheet/mock-submit-form.tsx', /className="h-11 w-full"/],
  ] as const) {
    const s = readFileSync(resolve(process.cwd(), p), 'utf8')
    if (!sel.test(s)) {
      findings.push({
        level: 'warning',
        message: `${p}: iter408-410 h-11 が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (mobile-create-workspace-tap-iter413) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
