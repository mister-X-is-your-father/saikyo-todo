/**
 * Phase 6.15 loop iter 501 (mode-D Desktop a11y) —
 * SprintCard 期間編集 form の onInvalid focus shift + aria-invalid 配線、codify
 * (iter499 / iter500 続編、manual handleSubmit 系 form の a11y 統一 第 3 弾)。
 *
 * 課題: src/components/workspace/sprints-panel.tsx 行 540-563 の SprintCard 期間編集 form:
 *   - `if (isInvalidDateRange(editStart, editEnd))` で manual validation + toast.error 出すが
 *     focus shift / aria-invalid 漏れ
 *   - end input を間違えて start 以前に設定 → toast でエラー表示するが SR / keyboard ユーザは
 *     「どの date input を直すべきか」 を視覚的に認識する必要がある
 *
 *   iter499 (CreateTimeEntryForm) / iter500 (ProposalRow) で確立した「manual handleSubmit 系
 *   form でも focus shift」 pattern を 3 件目 form に展開、a11y pattern 統一。
 *
 * fix (1 ファイル ~6 行差分):
 *   - useRef は既に import 済 (iter370 で他用途で導入済) → 追加 import 不要
 *   - `const editEndRef = useRef<HTMLInputElement>(null)` 宣言
 *   - validation 失敗 path で `editEndRef.current?.focus()` 呼び出し
 *   - end Input に `ref={editEndRef}` + `aria-invalid={isInvalidDateRange(editStart, editEnd) || undefined}` 配線
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter499 / iter500 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/sprints-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. editEndRef 宣言
  if (/const editEndRef = useRef<HTMLInputElement>\(null\)/.test(src)) {
    findings.push({ level: 'info', message: `${path}: editEndRef 宣言 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: editEndRef 宣言 不在` })
  }

  // 2. validation 失敗 path で focus
  if (
    /if \(isInvalidDateRange\(editStart, editEnd\)\) \{[\s\S]{0,300}?editEndRef\.current\?\.focus\(\)/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: validation 失敗 path で editEndRef.focus() 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: validation 失敗 path で editEndRef.focus() 配線 不在`,
    })
  }

  // 3. end Input に ref={editEndRef} + aria-invalid 配線
  if (
    /<Input[\s\S]{0,400}?ref=\{editEndRef\}[\s\S]{0,400}?id=\{`sprint-edit-end-\$\{sprint\.id\}`\}/.test(
      src,
    ) &&
    /aria-invalid=\{isInvalidDateRange\(editStart, editEnd\) \|\| undefined\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: end Input ref + aria-invalid OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: end Input ref + aria-invalid 不在` })
  }

  // 4. iter499 invariant: CreateTimeEntryForm minutesRef 維持
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
      message: `src/components/time-entry/create-time-entry-form.tsx: iter499 invariant 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src/components/time-entry/create-time-entry-form.tsx: iter499 invariant 破壊`,
    })
  }

  // 5. iter500 invariant: ProposalRow titleRef + dodRef 維持
  const dpSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /const titleRef = useRef<HTMLInputElement>\(null\)/.test(dpSrc) &&
    /const dodRef = useRef<HTMLInputElement>\(null\)/.test(dpSrc)
  ) {
    findings.push({
      level: 'info',
      message: `src/components/workspace/decompose-proposals-panel.tsx: iter500 invariant 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src/components/workspace/decompose-proposals-panel.tsx: iter500 invariant 破壊`,
    })
  }

  console.log(`\n=== Findings (sprint-period-onInvalid-iter501) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
