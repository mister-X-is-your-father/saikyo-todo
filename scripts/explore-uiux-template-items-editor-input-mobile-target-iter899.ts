/**
 * Phase 6.15 loop iter 899 (mode-M Mobile audit / iter889-898 follow-up) —
 * template-items-editor の 2 input (title IMEInput / dueOffset number input) を min-h-11 化。
 *
 * fix (1 ファイル 2 行差分):
 *   - IMEInput tile (flex-1 → min-h-11 flex-1)
 *   - input number dueOffset (h-9 → min-h-11)
 *
 * 検証: source-side regex assert + iter898 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  const titleOk = /placeholder="子 Item のタイトル"[\s\S]{0,400}className="min-h-11 flex-1"/.test(
    tie,
  )
  const dueOffsetOk = /placeholder="期日 offset 日"[\s\S]{0,400}className="min-h-11 w-28/.test(tie)
  if (titleOk && dueOffsetOk) {
    findings.push({
      level: 'info',
      message: `template-items-editor 2 input min-h-11 適用 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor min-h-11 title=${titleOk}, dueOffset=${dueOffsetOk}`,
    })
  }

  // iter898 invariant (verify via grep, regex window narrow)
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/className="min-h-11 flex-1"/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter898 invariant: quick-add min-h-11 flex-1 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter898 invariant: 破壊` })
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

  console.log(`\n=== Findings (template-items-editor-input-mobile-target-iter899) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
