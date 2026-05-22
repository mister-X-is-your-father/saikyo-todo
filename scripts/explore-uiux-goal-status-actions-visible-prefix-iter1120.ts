/**
 * Phase 6.15 loop iter1120: goals-panel GoalCard 3 status action button (complete / archive /
 * reactivate) aria-label visible-prefix regression guard。
 *
 * iter1120 で発見した bug: 3 button × 2 path + ν 3 conditional render (1 active / 2 completed /
 * 1 archived) = 8 aria-label の旧形式は visible "完了"/"アーカイブ"/"active に戻す" を末尾持ち。
 *
 * 修正 (goals-panel.tsx) — 8 path visible-prefix 形式統一。
 *
 * 実 supabase + goal fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-goal-status-actions-visible-prefix-iter1120.ts
 * 前提: なし
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/components/workspace/goals-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    '完了 — Goal「${goal.title}」を完了',
    'アーカイブ — Goal「${goal.title}」をアーカイブ',
    'active に戻す — Goal「${goal.title}」を active に戻す',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `goals-panel に visible-prefix '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — goals-panel 3 status action button aria-label は visible-prefix 配置済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
