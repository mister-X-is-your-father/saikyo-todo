/**
 * Phase 6.15 loop iter 499 (mode-D Desktop a11y) —
 * CreateTimeEntryForm validation 失敗時の focus shift + aria-invalid 配線、codify。
 *
 * 課題: src/components/time-entry/create-time-entry-form.tsx 行 28-49 の handleSubmit:
 *   - `if (durationMinutes <= 0) { toast.error(...); return }` で manual validation
 *   - validation 失敗時の focus shift 不在 → SR / keyboard ユーザは「どこを直すべきか」 不明
 *   - durationMinutes <= 0 でも `aria-invalid` 不在 → SR は invalid state を identify 不可
 *
 *   iter255 / iter375 / iter377 / iter378 / iter379 で確立した onInvalid focus pattern は
 *   react-hook-form 系 form に適用済 (login / signup / create-workspace / mock-login /
 *   mock-submit)。本 form は manual handleSubmit を使う非 react-hook-form 系 form だが、
 *   focus shift の概念は同 a11y pattern。
 *
 * fix (1 ファイル ~6 行差分):
 *   - `useRef` import 追加 (`useState` と一緒に)
 *   - `const minutesRef = useRef<HTMLInputElement>(null)` 追加
 *   - validation 失敗 path で `minutesRef.current?.focus()` + `select()` を呼び出し
 *   - IMEInput#teMinutes に `ref={minutesRef}` + `aria-invalid={durationMinutes <= 0 || undefined}` 配線
 *
 * 機能不変 (validation logic は同じ)、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + IMEInput forwardRef pattern 維持 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/time-entry/create-time-entry-form.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. useRef import 追加
  if (/import \{ useRef, useState \} from 'react'/.test(src)) {
    findings.push({ level: 'info', message: `${path}: useRef + useState import OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: useRef import 不在` })
  }

  // 2. minutesRef declared
  if (/const minutesRef = useRef<HTMLInputElement>\(null\)/.test(src)) {
    findings.push({ level: 'info', message: `${path}: minutesRef declared OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: minutesRef declared 不在` })
  }

  // 3. validation 失敗 path で focus + select
  if (
    /if \(durationMinutes <= 0\) \{[\s\S]{0,300}?minutesRef\.current\?\.focus\(\)[\s\S]{0,200}?minutesRef\.current\?\.select\(\)/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: validation 失敗 path で focus + select 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: validation 失敗 path で focus + select 配線 不在`,
    })
  }

  // 4. IMEInput#teMinutes に ref={minutesRef} 配線
  if (/<IMEInput[\s\S]{0,200}?ref=\{minutesRef\}[\s\S]{0,200}?id="teMinutes"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: IMEInput#teMinutes ref 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: IMEInput#teMinutes ref 配線 不在` })
  }

  // 5. aria-invalid 配線
  if (/aria-invalid=\{durationMinutes <= 0 \|\| undefined\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: aria-invalid 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: aria-invalid 配線 不在` })
  }

  // 6. IMEInput forwardRef pattern 維持 (regression cross-check)
  const imeSrc = readFileSync(resolve(process.cwd(), 'src/components/shared/ime-input.tsx'), 'utf8')
  if (/React\.forwardRef<HTMLInputElement,/.test(imeSrc) && /<Input\s+ref=\{ref\}/.test(imeSrc)) {
    findings.push({
      level: 'info',
      message: `src/components/shared/ime-input.tsx: forwardRef pattern 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src/components/shared/ime-input.tsx: forwardRef pattern 破壊`,
    })
  }

  // 7. form の aria-label / aria-busy / noValidate 維持 (regression)
  if (
    /aria-label="稼働記録 作成フォーム"/.test(src) &&
    /aria-busy=\{create\.isPending \|\| undefined\}/.test(src) &&
    /noValidate/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: form aria-label + aria-busy + noValidate 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: form 既存 aria 属性 破壊` })
  }

  console.log(`\n=== Findings (create-time-entry-onInvalid-iter499) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
