/**
 * Phase 6.15 loop iter 325 — dashboard-view (2 CardTitle: バーンダウン + MUST 一覧) +
 * today-view (1 CardTitle: グループ見出し) + pdca-panel (1 CardTitle: PDCA) に
 * heading semantic batch 付与、iter311/iter323/iter324 続編。
 *
 * fix: 各 CardTitle に `role="heading" aria-level={2}` を追加 (4 CardTitle, 4 行)。
 *   全て panel 主見出し相当なので level=2。shadcn 編集禁止ルール内 (props 経由)。
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

  for (const target of [
    'src/components/workspace/dashboard-view.tsx',
    'src/components/workspace/today-view.tsx',
    'src/components/workspace/pdca-panel.tsx',
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

  // iter311/iter323/iter324 invariant
  for (const path of [
    'src/components/workspace/items-board.tsx',
    'src/components/workspace/sprints-panel.tsx',
    'src/components/workspace/goals-panel.tsx',
    'src/components/workspace/budget-panel.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/<CardTitle\b[^>]*?role=["']heading["']/.test(s)) {
      findings.push({ level: 'warning', message: `${path}: heading semantic 回帰` })
    }
  }

  console.log(`\n=== Findings (dashboard-today-pdca-card-heading-iter325) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
