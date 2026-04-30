/**
 * Phase 6.15 loop iter 504 (mode-D Desktop a11y) —
 * ItemEditDialog handleSave の onInvalid focus shift + aria-invalid 配線、codify
 * (iter499-503 続編、manual handleSubmit form の a11y 統一 第 6 弾)。
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx 行 174-183 の handleSave:
 *   - `if (isMust && !dod.trim())` で manual validation + toast.error 出すが focus shift / aria-invalid 漏れ
 *   - `if (isInvalidDateRange(startDate, dueDate))` で manual validation + toast.error 出すが同様に漏れ
 *
 *   ItemEditDialog は Item の中核編集 UI で頻繁に使われる、a11y 統一が必要。
 *
 * fix (1 ファイル ~10 行差分):
 *   - useRef import 追加 (`useEffect, useMemo, useState` と一緒に)
 *   - dodRef + dueDateRef の `useRef<HTMLInputElement>(null)` 宣言
 *   - validation 失敗 path で `dodRef.current?.focus()` / `dueDateRef.current?.focus()` 呼び出し
 *   - IMEInput#editDod に `ref={dodRef}` + `aria-invalid={(isMust && !dod.trim()) || undefined}` 配線
 *   - IMEInput#editDue に `ref={dueDateRef}` + `aria-invalid={isInvalidDateRange(startDate, dueDate) || undefined}` 配線
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter499-503 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/item-edit-dialog.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. useRef import 追加
  if (/import \{ useEffect, useMemo, useRef, useState \} from 'react'/.test(src)) {
    findings.push({ level: 'info', message: `${path}: useRef import OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: useRef import 不在` })
  }

  // 2. dodRef + dueDateRef 宣言
  if (
    /const dodRef = useRef<HTMLInputElement>\(null\)/.test(src) &&
    /const dueDateRef = useRef<HTMLInputElement>\(null\)/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: dodRef + dueDateRef 宣言 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: dodRef + dueDateRef 宣言 不在` })
  }

  // 3. MUST + dod 空 path で focus
  if (/if \(isMust && !dod\.trim\(\)\) \{[\s\S]{0,300}?dodRef\.current\?\.focus\(\)/.test(src)) {
    findings.push({ level: 'info', message: `${path}: MUST + dod 空 path で focus 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: MUST + dod 空 path で focus 配線 不在` })
  }

  // 4. dueDate validation 失敗 path で focus
  if (
    /if \(isInvalidDateRange\(startDate, dueDate\)\) \{[\s\S]{0,300}?dueDateRef\.current\?\.focus\(\)/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: dueDate validation 失敗 path で focus 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: dueDate validation 失敗 path で focus 配線 不在`,
    })
  }

  // 5. IMEInput#editDod に ref + aria-invalid 配線
  if (
    /<IMEInput[\s\S]{0,300}?ref=\{dodRef\}[\s\S]{0,300}?id="editDod"/.test(src) &&
    /aria-invalid=\{\(isMust && !dod\.trim\(\)\) \|\| undefined\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: editDod IMEInput ref + aria-invalid OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: editDod IMEInput ref + aria-invalid 不在`,
    })
  }

  // 6. IMEInput#editDue に ref + aria-invalid 配線
  if (
    /<IMEInput[\s\S]{0,300}?ref=\{dueDateRef\}[\s\S]{0,300}?id="editDue"/.test(src) &&
    /aria-invalid=\{isInvalidDateRange\(startDate, dueDate\) \|\| undefined\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: editDue IMEInput ref + aria-invalid OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: editDue IMEInput ref + aria-invalid 不在`,
    })
  }

  // 7. iter499-503 invariant: 5 form の refs 維持 (regression cross-check)
  const refs = [
    {
      path: 'src/components/time-entry/create-time-entry-form.tsx',
      pat: /const minutesRef = useRef<HTMLInputElement>\(null\)/,
      label: 'iter499 minutesRef',
    },
    {
      path: 'src/components/workspace/decompose-proposals-panel.tsx',
      pat: /const titleRef = useRef<HTMLInputElement>\(null\)/,
      label: 'iter500 titleRef',
    },
    {
      path: 'src/components/workspace/sprints-panel.tsx',
      pat: /const editEndRef = useRef<HTMLInputElement>\(null\)/,
      label: 'iter501 editEndRef',
    },
    {
      path: 'src/components/workspace/goals-panel.tsx',
      pat: /const goalEndRef = useRef<HTMLInputElement>\(null\)/,
      label: 'iter502 goalEndRef',
    },
    {
      path: 'src/components/workspace/sprints-panel.tsx',
      pat: /const sprintEndRef = useRef<HTMLInputElement>\(null\)/,
      label: 'iter503 sprintEndRef',
    },
  ]
  for (const r of refs) {
    const s = readFileSync(resolve(process.cwd(), r.path), 'utf8')
    if (r.pat.test(s)) {
      findings.push({ level: 'info', message: `${r.path}: ${r.label} 維持 OK` })
    } else {
      findings.push({ level: 'warning', message: `${r.path}: ${r.label} 破壊` })
    }
  }

  console.log(`\n=== Findings (item-edit-onInvalid-iter504) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
