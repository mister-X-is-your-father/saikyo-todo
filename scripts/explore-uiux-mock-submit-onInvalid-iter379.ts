/**
 * Phase 6.15 loop iter 379 — `MockSubmitForm` (mock-timesheet 工数送信) の
 * handleSubmit に onInvalid handler + per-field role=alert + aria-invalid /
 * aria-describedby を追加 (iter378 で着手した mock-timesheet 系 a11y pattern を
 * 残 1 form に展開し系統完了)。
 *
 * 課題: src/components/mock-timesheet/mock-submit-form.tsx (4 fields:
 *   workDate / category / description / hoursDecimal) は iter378 と全く同様の
 *   a11y/UX gap (onInvalid なし / role=alert なし / aria-invalid 無し /
 *   mode 未指定 / pending button aria-label 無し) を抱えていた。zod が
 *   reject する場合 (例: hoursDecimal 0.25 multiple-of 違反 / 24h 超過 /
 *   description 2000 字超 / workDate format 違反) も silent に握り潰される。
 *
 * fix: iter255/375/377/378 で確立した 7 点 a11y pattern を mock-submit-form.tsx
 *   に水平展開 (1 file 約 50 line 追加)。これで mock-timesheet 系 (login +
 *   submit 計 2 form) が a11y/UX pattern を満たし完了。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。次 iter で別軸 (focus
 * restore on dialog close / aria-live region for toast 等) に切替予定。
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
  const target = 'src/components/mock-timesheet/mock-submit-form.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // iter379 main: onInvalid handler + setFocus
  if (!/function onInvalid\(errors:[\s\S]+?form\.setFocus\(firstError\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: onInvalid handler 不在 or setFocus 未呼出`,
    })
  } else {
    findings.push({ level: 'info', message: 'mock-submit onInvalid handler OK' })
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

  if (!/<form[\s\S]*?onSubmit=\{[^}]+\}[\s\S]*?noValidate/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <form noValidate> 不在 (browser native validation が onInvalid と二重発火)`,
    })
  }

  // per-field role="alert" 表示 + aria-invalid + aria-describedby
  const fields: { id: string; key: string }[] = [
    { id: 'tsDate', key: 'workDate' },
    { id: 'tsCategory', key: 'category' },
    { id: 'tsDescription', key: 'description' },
    { id: 'tsHours', key: 'hoursDecimal' },
  ]
  for (const { id, key } of fields) {
    const errorId = `${id}-error`
    if (!new RegExp(`id="${errorId}"[^>]*role="alert"`).test(src)) {
      findings.push({
        level: 'warning',
        message: `${target}: ${id} field の <p id="${errorId}" role="alert"> が無い`,
      })
    }
    if (!new RegExp(`aria-describedby=\\{[^}]*'${errorId}'[^}]*\\}`).test(src)) {
      findings.push({
        level: 'warning',
        message: `${target}: ${id} field の aria-describedby='${errorId}' wiring が無い`,
      })
    }
    if (
      !new RegExp(
        `aria-invalid=\\{form\\.formState\\.errors\\.${key}\\s*\\?\\s*true\\s*:\\s*undefined\\}`,
      ).test(src)
    ) {
      findings.push({
        level: 'warning',
        message: `${target}: ${id} field の aria-invalid (errors.${key}) wiring が無い`,
      })
    }
  }

  // pending button aria-label (iter255 pattern)
  if (!/aria-label=\{isPending\s*\?\s*'送信中… \(mock-timesheet/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: submit button に pending 時 aria-label が無い`,
    })
  }

  // iter378 (mock-login) invariant 維持 (regression guard、同 series 直前 iter)
  const loginSrc = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (
    !/function onInvalid\(errors:/.test(loginSrc) ||
    !/handleSubmit\(onSubmit, onInvalid\)/.test(loginSrc)
  ) {
    findings.push({
      level: 'warning',
      message: 'mock-login-form.tsx: iter378 onInvalid pattern が消えた (regression)',
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

  console.log(`\n=== Findings (mock-submit-onInvalid-iter379) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
