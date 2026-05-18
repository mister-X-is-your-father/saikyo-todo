/**
 * Phase 6.15 loop iter 987 — goals/page.tsx の Workspace 戻り Link に aria-label
 * 付与 + visible aria-hidden span wrap (iter986 続編、workspace back-Link sweep 2/8)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/(workspace)/[workspaceId]/goals/page.tsx'
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
  // iter986 invariant
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/sprints/page.tsx'),
    'utf8',
  )
  if (!/aria-label="Workspace dashboard に戻る"/.test(sprintsSrc)) {
    findings.push({ level: 'warning', message: `iter986 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter986 invariant OK` })
  }
  console.log(`\n=== Findings (goals-page-back-link-aria-label-iter987) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
