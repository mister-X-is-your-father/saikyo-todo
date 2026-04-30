/**
 * Phase 6.15 loop iter 503 (mode-D Desktop a11y) —
 * SprintsPanel Sprint 作成 form の onInvalid focus shift + aria-invalid 配線、codify
 * (iter499 / iter500 / iter501 / iter502 続編、manual handleSubmit form の a11y 統一 第 5 弾)。
 *
 * 課題: src/components/workspace/sprints-panel.tsx 行 151-173 の handleCreate (Sprint 作成):
 *   - `if (isInvalidDateRange(startDate, endDate))` で manual validation + toast.error 出すが
 *     focus shift / aria-invalid 漏れ
 *
 *   iter501 SprintCard 期間編集 / iter502 Goal 作成 と同 pattern。Sprint 作成は workspace の
 *   重要 form。
 *
 * fix (1 ファイル ~6 行差分):
 *   - useRef は既に import 済 (line 10)
 *   - `const sprintEndRef = useRef<HTMLInputElement>(null)` 宣言
 *   - validation 失敗 path で `sprintEndRef.current?.focus()` 呼び出し
 *   - end Input に `ref={sprintEndRef}` + `aria-invalid={isInvalidDateRange(startDate, endDate) || undefined}` 配線
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter501 (editEndRef) / iter502 (goalEndRef) 共存維持。
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

  // 1. sprintEndRef 宣言 (Sprint 作成 form 用)
  if (/const sprintEndRef = useRef<HTMLInputElement>\(null\)/.test(src)) {
    findings.push({ level: 'info', message: `${path}: sprintEndRef 宣言 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: sprintEndRef 宣言 不在` })
  }

  // 2. validation 失敗 path で focus
  if (
    /if \(isInvalidDateRange\(startDate, endDate\)\) \{[\s\S]{0,300}?sprintEndRef\.current\?\.focus\(\)/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: validation 失敗 path で sprintEndRef.focus() 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: validation 失敗 path で sprintEndRef.focus() 配線 不在`,
    })
  }

  // 3. end Input に ref={sprintEndRef} + aria-invalid 配線
  if (
    /<Input[\s\S]{0,400}?ref=\{sprintEndRef\}[\s\S]{0,400}?id="sprint-end"/.test(src) &&
    /aria-invalid=\{isInvalidDateRange\(startDate, endDate\) \|\| undefined\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: end Input ref + aria-invalid OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: end Input ref + aria-invalid 不在` })
  }

  // 4. iter501 invariant: editEndRef (SprintCard 期間編集) 共存維持
  if (
    /const editEndRef = useRef<HTMLInputElement>\(null\)/.test(src) &&
    /editEndRef\.current\?\.focus\(\)/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: iter501 invariant (editEndRef 共存) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: iter501 invariant 破壊` })
  }

  // 5. iter502 invariant: Goal goalEndRef 維持
  const goalsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /const goalEndRef = useRef<HTMLInputElement>\(null\)/.test(goalsSrc) &&
    /goalEndRef\.current\?\.focus\(\)/.test(goalsSrc)
  ) {
    findings.push({
      level: 'info',
      message: `src/components/workspace/goals-panel.tsx: iter502 invariant (goalEndRef) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src/components/workspace/goals-panel.tsx: iter502 invariant 破壊`,
    })
  }

  console.log(`\n=== Findings (sprint-create-onInvalid-iter503) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
