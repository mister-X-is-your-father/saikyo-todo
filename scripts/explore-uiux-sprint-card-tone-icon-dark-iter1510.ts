/**
 * Phase 6.15 loop iter1510: sprint-card toneIconClass の 3 tone に dark variant を補完
 * (mode-D contrast、iter1391/1393/1508/1509 pattern を sprint tone icon に展開)。
 *
 * sprint-card の toneIconClass は SprintProgressTone ('done' / 'onTrack' / 'behind') ごとに
 * icon の text color class を決定。3 tone とも `text-{emerald|blue|amber}-600` で light 固定、
 * dark mode で hue が浅く視認性低。iter1509 goals-panel TIER_ICON_CLASS と同 root pattern。
 *
 * 修正 (sprints-panel.tsx):
 *   done:     `text-emerald-600`           → `text-emerald-600 dark:text-emerald-400`
 *   onTrack:  `text-blue-600`              → `text-blue-600 dark:text-blue-400`
 *   behind:   `text-amber-600`             → `text-amber-600 dark:text-amber-400`
 *   (default empty 文字列は変更なし)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-card-tone-icon-dark-iter1510.ts
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
  const filePath = resolve(here, '../src/components/workspace/sprints-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const checks: Array<[string, string]> = [
    ['done', "'text-emerald-600 dark:text-emerald-400'"],
    ['onTrack', "'text-blue-600 dark:text-blue-400'"],
    ['behind', "'text-amber-600 dark:text-amber-400'"],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint-card toneIconClass.${name} に dark variant が無い (${expected})`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — sprint-card toneIconClass の 3 tone に dark variant 補完済 (iter1509 と同 pattern)',
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
