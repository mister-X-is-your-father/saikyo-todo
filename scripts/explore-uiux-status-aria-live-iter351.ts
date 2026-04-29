/**
 * Phase 6.15 loop iter 351 — `role="status"` を持つ高使用率 component に
 * `aria-live="polite"` を明示付与 (cross-SR 互換性向上)。
 *
 * 課題: WAI-ARIA spec で `role="status"` は default `aria-live="polite"` だが、
 *   一部 SR (古い JAWS など) は default を respect せず明示が必要。今回 fix した
 *   3 file は (1) async-states EmptyState は Today/Inbox/Workflows/Sprints/Goals/
 *   items-board/archive と全 view 共通使用、(2) dashboard-chip は Dashboard panel
 *   で 20+ chip を生成、(3) comment-thread は item edit dialog comments tab で
 *   毎回読込状態を SR 通知、と影響面が広い。
 *
 * fix: 3 file の `role="status"` 隣に `aria-live="polite"` を追加 (3 行)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 3 ファイル。
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

  for (const path of [
    'src/components/shared/async-states.tsx',
    'src/components/workspace/dashboard-chip.tsx',
    'src/components/workspace/comment-thread.tsx',
  ]) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (
      !/role="status"\s+aria-live="polite"|aria-live="polite"\s+(?:[^>]*?)role="status"/s.test(src)
    ) {
      findings.push({
        level: 'warning',
        message: `${path}: role="status" + aria-live="polite" 併用が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${path}: role=status + aria-live OK` })
    }
  }

  console.log(`\n=== Findings (status-aria-live-iter351) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
