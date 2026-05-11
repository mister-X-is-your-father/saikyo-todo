/**
 * Phase 6.15 loop iter 897 (mode-M Mobile audit / iter889-896 follow-up) —
 * integrations-panel の Source 作成 form 主要 3 input (kind select / name / token) を min-h-11 化。
 *
 * fix (1 ファイル 3 行差分):
 *   - src-kind select (h-9 → min-h-11)
 *   - src-name IMEInput
 *   - src-token IMEInput (Yamory token)
 *
 * 検証: source-side regex assert + iter896 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const kindOk = /id="src-kind"[\s\S]{0,300}className="min-h-11 w-full/.test(ip)
  const nameOk = /id="src-name"[\s\S]{0,800}className="min-h-11"/.test(ip)
  const tokenOk = /id="src-token"[\s\S]{0,800}className="min-h-11"/.test(ip)
  if (kindOk && nameOk && tokenOk) {
    findings.push({
      level: 'info',
      message: `integrations-panel Source 作成 3 主要 input min-h-11 適用 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel min-h-11 kind=${kindOk}, name=${nameOk}, token=${tokenOk}`,
    })
  }

  // iter896 invariant
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/id="tmpl-name"[\s\S]{0,800}className="min-h-11"/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter896 invariant: templates-panel tmpl-name min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter896 invariant: 破壊` })
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

  console.log(`\n=== Findings (integrations-source-create-form-input-mobile-target-iter897) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
