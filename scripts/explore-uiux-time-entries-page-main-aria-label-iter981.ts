/**
 * Phase 6.15 loop iter 981 (mode-D Desktop a11y) — time-entries/page.tsx main aria-label。
 * workspace page sweep 5/8 着地。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/(workspace)/[workspaceId]/time-entries/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')
  if (!/aria-label="稼働入力 やったこと \+ 時間を記録"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: aria-label 不在` })
  } else {
    findings.push({ level: 'info', message: `time-entries aria-label OK` })
  }
  for (const [iter, page, pattern] of [
    ['iter977', 'sprints', /aria-label="Sprint 計画 → 稼働 → 完了"/],
    ['iter978', 'goals', /aria-label="OKR \/ Goals \(Objective \+ Key Results\)"/],
    ['iter979', 'pdca', /aria-label="PDCA Plan \/ Do \/ Check \/ Act \+ Lead time"/],
    ['iter980', 'workflows', /aria-label="Workflows 自動化ワークフロー \(n8n 風\)"/],
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
  console.log(`\n=== Findings (time-entries-page-main-aria-label-iter981) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
