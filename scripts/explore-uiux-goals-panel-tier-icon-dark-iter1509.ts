/**
 * Phase 6.15 loop iter1509: goals-panel TIER_ICON_CLASS の 4 健全性 tier に dark variant
 * を補完 (mode-D contrast、iter1391/1393/1508 pattern を Goal 健全性 icon に展開)。
 *
 * goals-panel の TIER_ICON_CLASS は GoalHealthTier ('achieved' / 'on-track' / 'at-risk' /
 * 'behind' / 'idle') ごとに icon の text color class を定義。idle は `text-muted-foreground`
 * で CSS var theme-aware だが、他 4 tier は `text-emerald-600` / `text-blue-600` /
 * `text-amber-600` / `text-red-600` で light 固定。dark mode で hue が浅く視認性低。
 * iter1391/1393/1508 の dark variant 補完 pattern を本 config object にも展開。
 *
 * 修正 (goals-panel.tsx):
 *   achieved: `text-emerald-600`           → `text-emerald-600 dark:text-emerald-400`
 *   on-track: `text-blue-600`              → `text-blue-600 dark:text-blue-400`
 *   at-risk:  `text-amber-600`             → `text-amber-600 dark:text-amber-400`
 *   behind:   `text-red-600`               → `text-red-600 dark:text-red-400`
 *   idle:     `text-muted-foreground`      → 変更なし (theme-aware)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-goals-panel-tier-icon-dark-iter1509.ts
 * 前提: なし (source 直読 invariant)
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

  const checks: Array<[string, string]> = [
    ['achieved', "achieved: 'text-emerald-600 dark:text-emerald-400'"],
    ['on-track', "'on-track': 'text-blue-600 dark:text-blue-400'"],
    ['at-risk', "'at-risk': 'text-amber-600 dark:text-amber-400'"],
    ['behind', "behind: 'text-red-600 dark:text-red-400'"],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `goals-panel TIER_ICON_CLASS.${name} に dark variant が無い`,
      })
    }
  }

  // idle は theme-aware 維持
  if (!src.includes("idle: 'text-muted-foreground'")) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'goals-panel TIER_ICON_CLASS.idle が theme-aware (text-muted-foreground) でない',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — goals-panel TIER_ICON_CLASS の 4 tier に dark variant 補完済、idle は theme-aware 維持',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
