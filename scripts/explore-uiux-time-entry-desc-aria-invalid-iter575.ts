/**
 * Phase 6.15 loop iter 575 (mode-D Desktop a11y) —
 * CreateTimeEntryForm teDescription Input に aria-invalid (whitespace-only) を補完。
 *
 * 課題: create-time-entry-form.tsx 行 102-111 の teDescription は required +
 *   aria-required を持つが aria-invalid 不在。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-invalid={(description.length > 0 && description.trim() === '') || undefined}
 *
 * iter574 pattern を CreateTimeEntryForm に展開、8 form 統一達成。
 *
 * 検証: source-side regex assert + iter515-574 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ctef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )

  // 1. teDescription aria-invalid
  if (
    /id="teDescription"[\s\S]*?aria-invalid=\{\(description\.length > 0 && description\.trim\(\) === ''\) \|\| undefined\}/.test(
      ctef,
    )
  ) {
    findings.push({
      level: 'info',
      message: `create-time-entry-form.tsx: teDescription aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-form.tsx: teDescription aria-invalid 不在`,
    })
  }

  // 2. iter574 invariant: editTitle aria-invalid 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /id="editTitle"[\s\S]*?aria-invalid=\{\(title\.length > 0 && title\.trim\(\) === ''\)/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `iter574 invariant: editTitle aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter574 invariant: 破壊`,
    })
  }

  // 3. iter515 anchor invariant
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

  console.log(`\n=== Findings (time-entry-desc-aria-invalid-iter575) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
