/**
 * Phase 6.15 loop iter 980 (mode-D Desktop a11y) — workflows/page.tsx main aria-label
 * 付与、workspace page sweep 4/8 着地。iter977-979 sweep continuation。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/(workspace)/[workspaceId]/workflows/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')
  if (!/aria-label="Workflows 自動化ワークフロー \(n8n 風\)"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: aria-label 不在` })
  } else {
    findings.push({ level: 'info', message: `workflows aria-label OK` })
  }
  // iter977/978/979 invariants
  for (const [iter, page, pattern] of [
    ['iter977', 'sprints', /aria-label="Sprint 計画 → 稼働 → 完了"/],
    ['iter978', 'goals', /aria-label="OKR \/ Goals \(Objective \+ Key Results\)"/],
    ['iter979', 'pdca', /aria-label="PDCA Plan \/ Do \/ Check \/ Act \+ Lead time"/],
  ] as Array<[string, string, RegExp]>) {
    const otherSrc = readFileSync(
      resolve(process.cwd(), `src/app/(workspace)/[workspaceId]/${page}/page.tsx`),
      'utf8',
    )
    if (!pattern.test(otherSrc)) {
      findings.push({ level: 'warning', message: `${iter} invariant 破壊` })
    } else {
      findings.push({ level: 'info', message: `${iter} invariant OK` })
    }
  }
  console.log(`\n=== Findings (workflows-page-main-aria-label-iter980) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
