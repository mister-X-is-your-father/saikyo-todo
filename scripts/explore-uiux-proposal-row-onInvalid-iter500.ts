/**
 * Phase 6.15 loop iter 500 (mode-D Desktop a11y) —
 * DecomposeProposalsPanel ProposalRow editing form の onInvalid focus shift + aria-invalid 配線、codify
 * (iter499 続編、manual handleSubmit 系 form の a11y 統一 第 2 弾)。
 *
 * 課題: src/components/workspace/decompose-proposals-panel.tsx 行 294-318 の handleSaveEdit:
 *   - title 空 / MUST + dod 空 で manual validation + toast.error 出すが focus shift 不在
 *   - aria-invalid 不在 → SR は invalid state を identify 不可
 *
 *   iter499 (CreateTimeEntryForm) で確立した「manual handleSubmit 系 form でも focus shift」
 *   pattern を 2 件目 form に展開。
 *
 * fix (1 ファイル ~12 行差分):
 *   - useRef import 追加
 *   - titleRef / dodRef 2 個の `useRef<HTMLInputElement>(null)` 宣言
 *   - validation 失敗 path で `titleRef.current?.focus() + select()` / `dodRef.current?.focus()` 呼び出し
 *   - IMEInput#p-title に `ref={titleRef}` + `aria-invalid={!title.trim() || undefined}` 配線
 *   - IMEInput#p-dod に `ref={dodRef}` + `aria-invalid={(isMust && !dod.trim()) || undefined}` 配線
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter499 invariant (CreateTimeEntryForm) cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/decompose-proposals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. useRef import 追加
  if (/import \{ useRef, useState \} from 'react'/.test(src)) {
    findings.push({ level: 'info', message: `${path}: useRef + useState import OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: useRef import 不在` })
  }

  // 2. titleRef + dodRef 宣言
  if (
    /const titleRef = useRef<HTMLInputElement>\(null\)/.test(src) &&
    /const dodRef = useRef<HTMLInputElement>\(null\)/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: titleRef + dodRef 宣言 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: titleRef / dodRef 宣言 不在` })
  }

  // 3. title 空 path で focus + select
  if (
    /if \(!title\.trim\(\)\) \{[\s\S]{0,300}?titleRef\.current\?\.focus\(\)[\s\S]{0,200}?titleRef\.current\?\.select\(\)/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: title 空 path で focus + select 配線 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: title 空 path で focus 配線 不在` })
  }

  // 4. MUST + dod 空 path で focus
  if (/if \(isMust && !dod\.trim\(\)\) \{[\s\S]{0,300}?dodRef\.current\?\.focus\(\)/.test(src)) {
    findings.push({ level: 'info', message: `${path}: MUST + dod 空 path で focus 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: MUST + dod 空 path で focus 配線 不在` })
  }

  // 5. IMEInput#p-title に ref + aria-invalid 配線
  if (
    /<IMEInput[\s\S]{0,300}?ref=\{titleRef\}[\s\S]{0,300}?id=\{`p-title-\$\{proposal\.id\}`\}/.test(
      src,
    ) &&
    /aria-invalid=\{!title\.trim\(\) \|\| undefined\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: title IMEInput ref + aria-invalid OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: title IMEInput ref + aria-invalid 不在` })
  }

  // 6. IMEInput#p-dod に ref + aria-invalid 配線
  if (
    /<IMEInput[\s\S]{0,300}?ref=\{dodRef\}[\s\S]{0,300}?id=\{`p-dod-\$\{proposal\.id\}`\}/.test(
      src,
    ) &&
    /aria-invalid=\{\(isMust && !dod\.trim\(\)\) \|\| undefined\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: dod IMEInput ref + aria-invalid OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: dod IMEInput ref + aria-invalid 不在` })
  }

  // 7. iter499 invariant: CreateTimeEntryForm の minutesRef 配線維持 (regression)
  const cteSrc = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (
    /const minutesRef = useRef<HTMLInputElement>\(null\)/.test(cteSrc) &&
    /minutesRef\.current\?\.focus\(\)/.test(cteSrc)
  ) {
    findings.push({
      level: 'info',
      message: `src/components/time-entry/create-time-entry-form.tsx: iter499 invariant (minutesRef) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src/components/time-entry/create-time-entry-form.tsx: iter499 invariant 破壊`,
    })
  }

  console.log(`\n=== Findings (proposal-row-onInvalid-iter500) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
