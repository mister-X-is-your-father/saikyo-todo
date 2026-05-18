/**
 * Phase 6.15 loop iter 979 (mode-D Desktop a11y) — pdca/page.tsx の main に
 * aria-label="PDCA Plan / Do / Check / Act + Lead time" を付与、
 * iter977/978 sweep の continuation、workspace page 3/8 着地。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/(workspace)/[workspaceId]/pdca/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')
  if (!/aria-label="PDCA Plan \/ Do \/ Check \/ Act \+ Lead time"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: aria-label 不在` })
  } else {
    findings.push({ level: 'info', message: `pdca aria-label OK` })
  }
  // iter977/978 invariants
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/sprints/page.tsx'),
    'utf8',
  )
  if (!/aria-label="Sprint 計画 → 稼働 → 完了"/.test(sprintsSrc)) {
    findings.push({ level: 'warning', message: `iter977 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter977 invariant OK` })
  }
  const goalsSrc = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/goals/page.tsx'),
    'utf8',
  )
  if (!/aria-label="OKR \/ Goals \(Objective \+ Key Results\)"/.test(goalsSrc)) {
    findings.push({ level: 'warning', message: `iter978 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter978 invariant OK` })
  }
  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }
  console.log(`\n=== Findings (pdca-page-main-aria-label-iter979) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
