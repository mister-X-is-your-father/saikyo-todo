/**
 * Phase 6.15 loop iter1571: sprint-swimlane conflict bar ring に dark variant を補完。
 *
 * `ring-amber-700` (固定暗色) は dark bg 上で bg-amber-500/70 bar に対して視認性低下
 * (ring is darker than bar = ring 消える)。iter1493/1512-1535 chip ring dark sweep と同 pattern で
 * dark:ring-amber-400 (= lighter) 併記。
 *
 * 修正 (sprint-swimlane-disclosure.tsx):
 *   ring-1 ring-amber-700 → ring-1 ring-amber-700 dark:ring-amber-400
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-swimlane-conflict-ring-dark-iter1571.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )

  if (!src.includes('ring-amber-700 dark:ring-amber-400')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-swimlane conflict ring に dark:ring-amber-400 が無い',
    })
  }
  if (src.match(/ring-amber-700'(?!\s*\+\s*' dark)/)) {
    // verify dark variant is in same class (not split)
    if (!src.includes('ring-amber-700 dark:ring-amber-400')) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: 'sprint-swimlane ring-amber-700 は light 固定のまま残存',
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-swimlane conflict bar ring に dark variant 補完済')
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
