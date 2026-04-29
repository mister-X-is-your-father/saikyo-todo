/**
 * Phase 6.15 loop iter 323 — sprints-panel の 3 CardTitle に heading semantic を
 * 付与 (iter311 items-board QuickAdd CardTitle と同 pattern を 1 panel batch)。
 *
 * 課題: shadcn `<CardTitle>` は `<div data-slot="card-title">` で role=heading 不在。
 *   sprints-panel は workspace 主要 panel の 1 つで 3 CardTitle (新規 Sprint /
 *   Sprint name / Sprint デフォルト) があり、SR の heading navigation で skip 不可。
 *   iter311 で items-board の 1 CardTitle を fix したが panel 内の他は未対応。
 *
 * fix: 各 CardTitle に `role="heading" aria-level={N}` を追加。階層に応じて:
 *   - 新規 Sprint card (panel header) → level=2
 *   - Sprint name (各 Sprint row card) → level=3 (sub-section)
 *   - Sprint デフォルト card (panel header) → level=2
 *   shadcn 編集禁止ルールは props 経由 attr 追加で維持。
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
  const target = 'src/components/workspace/sprints-panel.tsx'
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

  // aria-level の組合せ: level=2 (panel header) と level=3 (sub-section) が併存
  if (!/aria-level=\{2\}/.test(src) || !/aria-level=\{3\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: aria-level={2}/{3} 両方欠落` })
  }

  // iter311 invariant: items-board の CardTitle heading semantic 維持
  const itemsBoard = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (!/<CardTitle\b[^>]*?role=["']heading["'][^>]*?aria-level=\{2\}/.test(itemsBoard)) {
    findings.push({ level: 'warning', message: 'items-board.tsx: iter311 heading 回帰' })
  }

  console.log(`\n=== Findings (sprints-card-heading-iter323) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
