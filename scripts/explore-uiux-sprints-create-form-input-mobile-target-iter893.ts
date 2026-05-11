/**
 * Phase 6.15 loop iter 893 (mode-M Mobile audit / iter889-892 follow-up) —
 * sprints-panel の Sprint 作成 form 3 input (name / start / end) を min-h-11 化。
 *
 * 課題: Sprint 作成 form は最頻 Sprint cycle の起点で mobile 利用も多い、Input h-8 (32px)
 *   は WCAG 2.5.8 AAA + iOS 44pt 未満。
 *
 * fix (1 ファイル 3 行差分): name (IMEInput) + start + end (Input date)。
 *
 * 検証: source-side regex assert + iter892 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  // 3 input が min-h-11 に統一されていること
  const nameOk = /id="sprint-name"[\s\S]{0,800}className="min-h-11"/.test(sp)
  const startOk = /id="sprint-start"[\s\S]{0,400}className="min-h-11"/.test(sp)
  const endOk = /id="sprint-end"[\s\S]{0,400}className="min-h-11"/.test(sp)
  if (nameOk && startOk && endOk) {
    findings.push({
      level: 'info',
      message: `sprints-panel Sprint 作成 3 input min-h-11 適用 OK (name + start + end)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel min-h-11 適用 name=${nameOk}, start=${startOk}, end=${endOk}`,
    })
  }

  // iter892 invariant
  const ctf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if ((ctf.match(/min-h-11/g) ?? []).length >= 4) {
    findings.push({
      level: 'info',
      message: `iter892 invariant: create-time-entry-form min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter892 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprints-create-form-input-mobile-target-iter893) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
