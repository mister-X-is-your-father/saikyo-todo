/**
 * Phase 6.15 loop iter 985 — workspace dashboard /[workspaceId]/page.tsx main aria-label。
 * workspace sweep 9/9 完備 (8 sub-page + 1 dashboard)、全 workspace page で SR landmark
 * nav 識別可能。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/(workspace)/[workspaceId]/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')
  if (
    !/aria-label="Workspace dashboard \(Today \/ Inbox \/ Kanban \/ Backlog \/ Gantt \/ Dashboard\)"/.test(
      src,
    )
  ) {
    findings.push({ level: 'warning', message: `${target}: aria-label 不在` })
  } else {
    findings.push({ level: 'info', message: `workspace dashboard aria-label OK` })
  }
  for (const [iter, page, pattern] of [
    ['iter977', 'sprints', /aria-label="Sprint 計画 → 稼働 → 完了"/],
    ['iter978', 'goals', /aria-label="OKR \/ Goals \(Objective \+ Key Results\)"/],
    ['iter979', 'pdca', /aria-label="PDCA Plan \/ Do \/ Check \/ Act \+ Lead time"/],
    ['iter980', 'workflows', /aria-label="Workflows 自動化ワークフロー \(n8n 風\)"/],
    ['iter981', 'time-entries', /aria-label="稼働入力 やったこと \+ 時間を記録"/],
    ['iter982', 'templates', /aria-label="Templates ワークパッケージ定義"/],
    [
      'iter983',
      'integrations',
      /aria-label="API 連携 外部 API \(Yamory \/ カスタム REST\) → Item 取込"/,
    ],
    ['iter984', 'archive', /aria-label="アーカイブ済 Item 一覧"/],
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
  console.log(`\n=== Findings (workspace-dashboard-main-aria-label-iter985) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
