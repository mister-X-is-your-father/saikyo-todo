/**
 * Phase 6.15 loop iter 345 — integrations-panel (4 input: src-name + src-token +
 * src-project-ids + src-url) + workflows-panel (1 input: wf-name) + template-
 * items-editor (1 input: 子 Item title) に autoComplete を batch 追加、iter343/344
 * 続編。token は new-password、他は off。URL / project-IDs / token に
 * spellCheck={false} も追加 (slug-style / 機微情報なので spell check 不要)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 3 ファイル。
 *
 * 検証: source-side regex assert で codify。
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
  const offCount = (ip.match(/autoComplete="off"/g) ?? []).length
  if (offCount < 3) {
    findings.push({
      level: 'warning',
      message: `integrations-panel.tsx: autoComplete="off" 必要 ≥3 件 (現状 ${offCount})`,
    })
  }
  if (!/autoComplete="new-password"/.test(ip)) {
    findings.push({ level: 'warning', message: 'integrations-panel.tsx: token new-password 不在' })
  }

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if ((wp.match(/autoComplete="off"/g) ?? []).length < 1) {
    findings.push({ level: 'warning', message: 'workflows-panel.tsx: autoComplete="off" 不在' })
  }

  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if ((tie.match(/autoComplete="off"/g) ?? []).length < 1) {
    findings.push({
      level: 'warning',
      message: 'template-items-editor.tsx: autoComplete="off" 不在',
    })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: '6 input autoComplete OK' })
  }

  console.log(`\n=== Findings (integ-wf-tmpl-autocomplete-iter345) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
