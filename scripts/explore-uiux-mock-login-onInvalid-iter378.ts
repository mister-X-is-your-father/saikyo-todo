/**
 * Phase 6.15 loop iter 378 — `MockLoginForm` (mock-timesheet 統合) の
 * handleSubmit に onInvalid handler + per-field role=alert + aria-invalid /
 * aria-describedby を追加 (iter255 / iter375 / iter377 a11y pattern を
 * mock-timesheet 系に水平展開)。
 *
 * 課題: src/components/mock-timesheet/mock-login-form.tsx は
 *   - `onSubmit={form.handleSubmit(onSubmit)}` で onInvalid 引数なし
 *   - field 毎の error 表示 (`<p role="alert">`) 一切なし
 *   - aria-invalid / aria-describedby も無し
 *   - mode 未指定 (default 'onSubmit') で blur 時 inline error 出ず
 *   - pending button に aria-label 無し (button text の "認証中..." は
 *     SR には新規 announce されないので状態変化が伝わらない)
 *   user は zod validation 失敗で submit が silent に握り潰されたかのように
 *   見え、何が悪いのか分からない (WCAG 3.3.1 / 4.1.3 違反)。
 *
 * fix: mock-login-form.tsx に iter255/375/377 で確立した 6 点 a11y pattern を
 *   水平展開 (1 file 約 30 行追加)。
 *   1. useForm に `mode: 'onTouched'` 追加 (blur 時 inline error)
 *   2. `function onInvalid(errors)` を追加し第 1 errored field へ setFocus
 *   3. `<form noValidate>` で browser native validation を抑止
 *   4. handleSubmit(onSubmit, onInvalid) で wire up
 *   5. 各 IMEInput に aria-invalid + aria-describedby を error 有無で切替
 *   6. 各 field に `<p role="alert" id="<field>-error">` を error 時のみ render
 *   7. submit button に pending 時 aria-label 追加 (iter255 pattern)
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。残 mock-submit-form.tsx は
 * 次 iter で同 pattern 展開予定。
 *
 * 検証: source-side regex assert で codify。mock-timesheet route は
 *   workspace 配下 (auth 必須) のため cloud env で full integration test 不可、
 *   source-side audit で代替。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/mock-timesheet/mock-login-form.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // iter378 main: onInvalid handler + setFocus
  if (!/function onInvalid\(errors:[\s\S]+?form\.setFocus\(firstError\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: onInvalid handler 不在 or setFocus 未呼出`,
    })
  } else {
    findings.push({ level: 'info', message: 'mock-login onInvalid handler OK' })
  }

  if (!/handleSubmit\(onSubmit, onInvalid\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: handleSubmit に onInvalid wire up されていない`,
    })
  }

  if (!/mode:\s*'onTouched'/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: useForm mode 'onTouched' 不在 (blur 時 inline error が出ない)`,
    })
  }

  if (!/<form\s+method="post"\s+onSubmit=\{[^}]+\}\s+noValidate/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <form noValidate> 不在 (browser native validation が onInvalid と二重発火)`,
    })
  }

  // per-field role="alert" 表示
  for (const field of ['tsEmail', 'tsPassword']) {
    const errorId = `${field}-error`
    const alertRe = new RegExp(`id="${errorId}"[^>]*role="alert"`)
    if (!alertRe.test(src)) {
      findings.push({
        level: 'warning',
        message: `${target}: ${field} field の <p id="${errorId}" role="alert"> が無い`,
      })
    }
    const describedRe = new RegExp(`aria-describedby=\\{[^}]*'${errorId}'[^}]*\\}`)
    if (!describedRe.test(src)) {
      findings.push({
        level: 'warning',
        message: `${target}: ${field} field の aria-describedby='${errorId}' wiring が無い`,
      })
    }
    const invalidRe = new RegExp(
      `aria-invalid=\\{form\\.formState\\.errors\\.${field === 'tsEmail' ? 'email' : 'password'}\\s*\\?\\s*true\\s*:\\s*undefined\\}`,
    )
    if (!invalidRe.test(src)) {
      findings.push({
        level: 'warning',
        message: `${target}: ${field} field の aria-invalid wiring が無い`,
      })
    }
  }

  // pending button aria-label (iter255 pattern)
  if (!/aria-label=\{isPending\s*\?\s*'認証中… \(mock-timesheet/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: submit button に pending 時 aria-label が無い`,
    })
  }

  // iter255 / iter375 / iter377 invariant 維持 (regression guard)
  for (const f of [
    'src/components/auth/login-form.tsx',
    'src/components/auth/signup-form.tsx',
    'src/components/workspace/create-workspace-form.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/function onInvalid\(errors:/.test(s) || !/handleSubmit\(onSubmit, onInvalid\)/.test(s)) {
      findings.push({
        level: 'warning',
        message: `${f}: iter375/iter377 onInvalid pattern が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (mock-login-onInvalid-iter378) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
