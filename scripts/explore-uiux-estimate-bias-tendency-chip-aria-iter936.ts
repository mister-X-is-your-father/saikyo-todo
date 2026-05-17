/**
 * Phase 6.15 loop iter 936 (mode-D Desktop a11y) —
 * estimate-bias-insight CardTitle 内 tendency chip の visible {label} を
 * aria-hidden span で wrap、parent span aria-label "傾向: ${label}" 単独 SR 経路に統一
 * (iter914/920/921/923 chip pattern を estimate-bias tendency chip に展開、7 件目)。
 *
 * 経緯: parent span aria-label "傾向: ${label}" を持つにも関わらず内側 visible {label}
 *   に aria-hidden 無し → SR 二重読み。
 *
 * 修正 (+1/-1 行、1 file): 内側 visible {label} を <span aria-hidden="true"> で wrap。
 *
 * 検証: source-side regex assert + iter735/935 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ebi = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )

  // 1. tendency chip 内側 aria-hidden 追加 OK
  if (
    /aria-label=\{`傾向: \$\{label\}`\}\s*>\s*<span aria-hidden="true">\{label\}<\/span>/.test(ebi)
  ) {
    findings.push({
      level: 'info',
      message: `estimate-bias tendency chip 内側 aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `estimate-bias tendency chip 内側 aria-hidden 欠落`,
    })
  }

  // 2. data-testid / aria-label 維持
  if (/data-testid="estimate-bias-tendency"\s*\n\s*aria-label=\{`傾向: \$\{label\}`\}/.test(ebi)) {
    findings.push({
      level: 'info',
      message: `estimate-bias tendency chip data-testid + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `estimate-bias tendency chip 属性破壊`,
    })
  }

  // iter935 invariant: instantiate-form vars empty role/aria-live
  const ifrm = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid=\{`instantiate-vars-empty-\$\{template\.id\}`\}/.test(
      ifrm,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter935 invariant: instantiate-form vars empty role/aria-live 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter935 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (estimate-bias-tendency-chip-aria-iter936) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
