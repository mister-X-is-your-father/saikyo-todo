/**
 * Phase 6.15 loop iter 405 — mock-timesheet 2 form (mock-login-form +
 * mock-submit-form) に aria-label + aria-busy を追加し form landmark 化 +
 * pending 状態 SR 通知 (iter256/iter262 pattern を mock-timesheet に水平展開)。
 *
 * 課題: src/components/mock-timesheet/mock-login-form.tsx +
 *   mock-submit-form.tsx は <form> に aria-label / aria-labelledby /
 *   aria-busy 一切無し:
 *   (a) form は landmark 化していない (HTML5 spec: form 要素は accessible
 *       name を持つと暗黙 landmark) → SR landmark navigation で form に
 *       直行不可、汎用 generic として扱われる
 *   (b) submit pending 中の busy state は button focus 時の aria-label のみ
 *       で SR に伝わり、focus 外れ / toast 読み上げ中は form 全体の進行
 *       状況が消える
 *
 *   iter256 (auth form aria-labelledby) + iter262 (auth form aria-busy) で
 *   /login + /signup form には pattern 適用済だが、mock-timesheet 2 form
 *   は未適用で UX 断絶 (iter378-381 で mock-timesheet a11y polish したが
 *   form-level landmark / busy は別軸で残っていた)。
 *
 * fix: 2 file × 各 2 line addition (aria-label + aria-busy) = 計 4 line。
 *   - mock-login-form.tsx: aria-label="Mock Timesheet ログインフォーム" +
 *     aria-busy={isPending || undefined}
 *   - mock-submit-form.tsx: aria-label="Mock Timesheet 工数送信フォーム" +
 *     aria-busy={isPending || undefined}
 *
 *   aria-labelledby ではなく aria-label を使う理由: page の h1 は
 *   "Mock Timesheet" generic で 2 form を区別不能。aria-label でフォーム
 *   役割 (ログイン / 工数送信) を明示する方が landmark navigation 上意味的
 *   に正確。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。視覚的 layout 不変。
 *
 * 検証: source-side regex assert + MCP browser_evaluate で form の
 *   aria-label / aria-busy / landmark 化を直接確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const loginPath = 'src/components/mock-timesheet/mock-login-form.tsx'
  const submitPath = 'src/components/mock-timesheet/mock-submit-form.tsx'
  const loginSrc = readFileSync(resolve(process.cwd(), loginPath), 'utf8')
  const submitSrc = readFileSync(resolve(process.cwd(), submitPath), 'utf8')

  // 1. mock-login-form aria-label
  if (!/aria-label="Mock Timesheet ログインフォーム"/.test(loginSrc)) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: aria-label="Mock Timesheet ログインフォーム" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${loginPath}: aria-label OK` })
  }

  // 2. mock-login-form aria-busy
  if (!/aria-busy=\{isPending \|\| undefined\}/.test(loginSrc)) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: aria-busy={isPending || undefined} が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${loginPath}: aria-busy OK` })
  }

  // 3. mock-submit-form aria-label
  if (!/aria-label="Mock Timesheet 工数送信フォーム"/.test(submitSrc)) {
    findings.push({
      level: 'warning',
      message: `${submitPath}: aria-label="Mock Timesheet 工数送信フォーム" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${submitPath}: aria-label OK` })
  }

  // 4. mock-submit-form aria-busy
  if (!/aria-busy=\{isPending \|\| undefined\}/.test(submitSrc)) {
    findings.push({
      level: 'warning',
      message: `${submitPath}: aria-busy={isPending || undefined} が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${submitPath}: aria-busy OK` })
  }

  // iter378/iter379 invariant 維持: handleSubmit(onSubmit, onInvalid) wire up
  for (const [path, src] of [
    [loginPath, loginSrc],
    [submitPath, submitSrc],
  ] as const) {
    if (!/handleSubmit\(onSubmit,\s*onInvalid\)/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${path}: iter378/iter379 onInvalid wire up が消えた (regression)`,
      })
    }
  }

  // iter256 invariant 維持: auth form の aria-labelledby
  for (const path of ['src/components/auth/login-form.tsx', 'src/components/auth/signup-form.tsx']) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/aria-labelledby="(login|signup)-heading"/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${path}: iter256 aria-labelledby が消えた (regression)`,
      })
    }
  }

  // iter262 invariant 維持: auth form の aria-busy
  for (const path of ['src/components/auth/login-form.tsx', 'src/components/auth/signup-form.tsx']) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/aria-busy=\{isPending \|\| undefined\}/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${path}: iter262 aria-busy が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (mock-form-landmark-iter405) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
