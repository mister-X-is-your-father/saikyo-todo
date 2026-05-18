/**
 * Phase 6.15 loop iter 992 — integrations/page.tsx back-Link aria-label (workspace back sweep 7/8)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/(workspace)/[workspaceId]/integrations/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')
  if (!/aria-label="Workspace dashboard に戻る"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: aria-label 不在` })
  } else {
    findings.push({ level: 'info', message: `back-Link aria-label OK` })
  }
  if (!/<span aria-hidden="true">← Workspace<\/span>/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: visible aria-hidden span wrap 不在` })
  } else {
    findings.push({ level: 'info', message: `visible aria-hidden span wrap OK` })
  }
  console.log(`\n=== Findings (integrations-page-back-link-aria-label-iter992) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
