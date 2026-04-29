/**
 * Phase 6.15 loop iter 324 — goals-panel (2 CardTitle) + budget-panel (1 CardTitle)
 * に heading semantic を batch 付与、iter311/iter323 続編。
 *
 * 課題: shadcn `<CardTitle>` は role=heading 不在。iter311 (items-board) /
 *   iter323 (sprints-panel) と同じく workspace 主要 panel の 3 CardTitle を
 *   sweep。新規 Goal / Goal name / AI 月次コスト の 3 件。
 *
 * fix: 各 CardTitle に `role="heading" aria-level={N}` を追加 (新規 Goal
 *   panel header → level=2、Goal name 各 row card → level=3、AI 月次コスト
 *   panel header → level=2)。shadcn 編集禁止ルール内 (props 経由)。
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
    'src/components/workspace/goals-panel.tsx',
    'src/components/workspace/budget-panel.tsx',
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

  // iter311/iter323 invariant
  for (const path of [
    'src/components/workspace/items-board.tsx',
    'src/components/workspace/sprints-panel.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/<CardTitle\b[^>]*?role=["']heading["']/.test(s)) {
      findings.push({ level: 'warning', message: `${path}: heading semantic 回帰` })
    }
  }

  console.log(`\n=== Findings (goals-budget-card-heading-iter324) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
