/**
 * Phase 6.15 loop iter 326 — personal-period-view (2 CardTitle: ゴール / Item) +
 * team-context-editor (1 CardTitle: チームコンテキスト) に heading semantic を batch
 * 付与、iter311/iter323-325 続編 (sweep 完結回)。
 *
 * これで workspace 内 CardTitle 主要 14 件の heading semantic sweep 完結
 * (items-board 1 + sprints 3 + goals 2 + budget 1 + dashboard 2 + today 1 +
 * pdca 1 + personal-period 2 + team-context 1)。
 *
 * fix: 各 CardTitle に `role="heading" aria-level={2}` を追加 (3 CardTitle, 3 行)。
 *   shadcn 編集禁止ルール内 (props 経由)。
 *
 * 検証: source-side regex assert で codify。
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  for (const target of [
    'src/components/workspace/personal-period-view.tsx',
    'src/components/workspace/team-context-editor.tsx',
  ]) {
    const src = readFileSync(resolve(process.cwd(), target), 'utf8')
    const cardTitleMatches = src.match(/<CardTitle\b/g) ?? []
    const cardTitleWithHeading = src.match(/<CardTitle\b[^>]*?role=["']heading["']/g) ?? []
    if (cardTitleMatches.length !== cardTitleWithHeading.length) {
      findings.push({
        level: 'warning',
        message: `${target}: <CardTitle>=${cardTitleMatches.length}, role=heading 付き=${cardTitleWithHeading.length}`,
      })
    } else {
      findings.push({
        level: 'info',
        message: `${target}: 全 ${cardTitleMatches.length} CardTitle に heading semantic 付与 OK`,
      })
    }
  }

  // workspace 主要 panel sweep audit (sprints/goals/budget/dashboard/today/pdca/items-board)
  const allFiles = execSync(
    'grep -rl "<CardTitle" src/components/workspace --include="*.tsx" || true',
    { encoding: 'utf8' },
  )
    .split('\n')
    .filter(Boolean)
  let totalCT = 0
  let totalHeading = 0
  for (const f of allFiles) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    totalCT += (s.match(/<CardTitle\b/g) ?? []).length
    totalHeading += (s.match(/<CardTitle\b[^>]*?role=["']heading["']/g) ?? []).length
  }
  findings.push({
    level: 'info',
    message: `workspace CardTitle sweep 集計: ${totalCT} 件中 ${totalHeading} 件 heading semantic 付与`,
  })

  console.log(`\n=== Findings (period-team-card-heading-iter326) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
