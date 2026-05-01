/**
 * Phase 6.15 loop iter 574 (mode-D Desktop a11y) —
 * ItemEditDialog editTitle Input に aria-invalid (whitespace-only) を補完。
 *
 * 課題: item-edit-dialog.tsx 行 482-491 の editTitle (item title 編集) は required +
 *   aria-required を持つが aria-invalid 不在。スペースのみ入力でも SR には valid と伝わる。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-invalid={(title.length > 0 && title.trim() === '') || undefined}
 *
 * iter570/571/572 pattern を ItemEditDialog editTitle に展開、7 form 統一達成。
 *
 * 検証: source-side regex assert + iter515-573 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. editTitle aria-invalid
  if (
    /id="editTitle"[\s\S]*?aria-invalid=\{\(title\.length > 0 && title\.trim\(\) === ''\) \|\| undefined\}/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: editTitle aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: editTitle aria-invalid 不在`,
    })
  }

  // 2. iter540 invariant: editStart aria-invalid 維持
  if (
    /id="editStart"[\s\S]*?aria-invalid=\{isInvalidDateRange\(startDate, dueDate\) \|\| undefined\}/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter540 invariant: editStart aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter540 invariant: 破壊`,
    })
  }

  // 3. iter572 invariant: 子 Item title aria-invalid 維持
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (
    /aria-label="子 Item のタイトル"[\s\S]*?aria-invalid=\{\(title\.length > 0 && title\.trim\(\) === ''\)/.test(
      tie,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter572 invariant: 子 Item title aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter572 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (edit-title-aria-invalid-iter574) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
