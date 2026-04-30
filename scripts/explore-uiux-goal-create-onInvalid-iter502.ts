/**
 * Phase 6.15 loop iter 502 (mode-D Desktop a11y) —
 * Goal 作成 form の onInvalid focus shift + aria-invalid 配線、codify
 * (iter499 / iter500 / iter501 続編、manual handleSubmit form の a11y 統一 第 4 弾)。
 *
 * 課題: src/components/workspace/goals-panel.tsx 行 93-99 の handleCreate:
 *   - `if (isInvalidDateRange(startDate, endDate))` で manual validation + toast.error 出すが
 *     focus shift / aria-invalid 漏れ
 *
 *   iter501 SprintCard 期間編集 form と同 pattern。Goal 作成は workspace 初回設定の重要 form
 *   なので a11y 統一が必要。
 *
 * fix (1 ファイル ~6 行差分):
 *   - useRef import 追加 (`useState` と一緒に)
 *   - `const goalEndRef = useRef<HTMLInputElement>(null)` 宣言
 *   - validation 失敗 path で `goalEndRef.current?.focus()` 呼び出し
 *   - end Input に `ref={goalEndRef}` + `aria-invalid={isInvalidDateRange(startDate, endDate) || undefined}` 配線
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter499 / iter500 / iter501 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/goals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. useRef import 追加
  if (/import \{ useRef, useState \} from 'react'/.test(src)) {
    findings.push({ level: 'info', message: `${path}: useRef + useState import OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: useRef import 不在` })
  }

  // 2. goalEndRef 宣言
  if (/const goalEndRef = useRef<HTMLInputElement>\(null\)/.test(src)) {
    findings.push({ level: 'info', message: `${path}: goalEndRef 宣言 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: goalEndRef 宣言 不在` })
  }

  // 3. validation 失敗 path で focus
  if (
    /if \(isInvalidDateRange\(startDate, endDate\)\) \{[\s\S]{0,300}?goalEndRef\.current\?\.focus\(\)/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: validation 失敗 path で goalEndRef.focus() 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: validation 失敗 path で goalEndRef.focus() 配線 不在`,
    })
  }

  // 4. end Input に ref + aria-invalid 配線
  if (
    /<Input[\s\S]{0,400}?ref=\{goalEndRef\}[\s\S]{0,400}?id="goal-end"/.test(src) &&
    /aria-invalid=\{isInvalidDateRange\(startDate, endDate\) \|\| undefined\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: end Input ref + aria-invalid OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: end Input ref + aria-invalid 不在` })
  }

  // 5. iter501 invariant: SprintCard editEndRef 維持
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /const editEndRef = useRef<HTMLInputElement>\(null\)/.test(sprintsSrc) &&
    /editEndRef\.current\?\.focus\(\)/.test(sprintsSrc)
  ) {
    findings.push({
      level: 'info',
      message: `src/components/workspace/sprints-panel.tsx: iter501 invariant 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src/components/workspace/sprints-panel.tsx: iter501 invariant 破壊`,
    })
  }

  // 6. iter499 / iter500 invariant: form refs 維持
  const cteSrc = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  const dpSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /const minutesRef = useRef<HTMLInputElement>\(null\)/.test(cteSrc) &&
    /const titleRef = useRef<HTMLInputElement>\(null\)/.test(dpSrc) &&
    /const dodRef = useRef<HTMLInputElement>\(null\)/.test(dpSrc)
  ) {
    findings.push({
      level: 'info',
      message: `iter499 + iter500 form refs (minutesRef + titleRef + dodRef) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter499 + iter500 form refs 破壊`,
    })
  }

  console.log(`\n=== Findings (goal-create-onInvalid-iter502) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
