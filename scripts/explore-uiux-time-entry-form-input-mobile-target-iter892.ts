/**
 * Phase 6.15 loop iter 892 (mode-M Mobile audit / iter889-891 follow-up) —
 * create-time-entry-form の 4 input (date / category select / description / minutes) を
 * min-h-11 化。
 *
 * 課題: 稼働記録 input form は日次入力 path で mobile 利用頻繁、shadcn Input h-8 (32px) と
 *   select h-9 (36px) は WCAG 2.5.8 AAA / iOS 44pt 未満。
 *
 * fix (1 ファイル 4 行差分):
 *   - teDate IMEInput
 *   - teCategory select (h-9 → min-h-11)
 *   - teDescription IMEInput
 *   - teMinutes IMEInput (w-24 と併用)
 *
 * 検証: source-side regex assert + iter891 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ctf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  const count = (ctf.match(/min-h-11/g) ?? []).length
  if (count >= 4) {
    findings.push({
      level: 'info',
      message: `create-time-entry-form min-h-11 適用 OK (${count} 件、4 input + 1 submit button)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-form min-h-11 件数 ${count} (期待 ≥4)`,
    })
  }

  // 旧 h-9 が select に残っていないこと
  if (/className="h-9 rounded border px-2 text-sm"\s*$/m.test(ctf)) {
    findings.push({
      level: 'warning',
      message: `create-time-entry-form select h-9 旧 className 残存`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `create-time-entry-form select h-9 → min-h-11 統一 OK`,
    })
  }

  // iter891 invariant
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if ((bp.match(/className="min-h-11"/g) ?? []).length >= 3) {
    findings.push({
      level: 'info',
      message: `iter891 invariant: budget-panel min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter891 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (time-entry-form-input-mobile-target-iter892) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
