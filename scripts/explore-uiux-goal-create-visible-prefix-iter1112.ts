/**
 * Phase 6.15 loop iter1112: goals-panel goal-create-btn aria-label visible-prefix regression guard。
 *
 * iter1112 で発見した bug: goal create button の default + pending 旧 aria-label
 * "Goal を新規作成" / "Goal を作成中…" は visible "作成" / "作成中…" を末尾持ちで voice control
 * prefix-matching match 不可。empty-title path は維持。
 *
 * 修正 (goals-panel.tsx):
 *   - default: "作成 — Goal を新規作成"
 *   - pending: "作成中… — Goal を作成中"
 *
 * 実 supabase + goal fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-goal-create-visible-prefix-iter1112.ts
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

  const expected = ["'作成 — Goal を新規作成'", "'作成中… — Goal を作成中'"]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `goals-panel に visible-prefix '${e}' が無い`,
      })
    }
  }
  const oldBares = ["'Goal を新規作成'", "'Goal を作成中…'"]
  for (const s of oldBares) {
    if (src.includes(s)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 bare aria-label '${s}' が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — goal create-btn aria-label は visible-prefix 配置済')
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
