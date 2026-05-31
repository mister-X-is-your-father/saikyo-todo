/**
 * Phase 6.15 loop iter1557: activity-log activity-log-hint chip aria-label を
 * visible 冒頭 em-dash 形式に migration (iter1093-1556 sweep convention 着地)。
 *
 * 旧 aria-label `"Activity 状態: ${hint.label}"` は ':' colon 区切で visible "${hint.label}"
 * を末尾に持ち voice control prefix-matching「click ${label}」 が strict prefix-match で不可
 * (substring 一致のみ)。iter1553/1554/1555/1556 sweep convention で visible 冒頭固定 +
 * em-dash 区切 (`${hint.label} — Activity 状態`)。
 *
 * 修正 (activity-log.tsx):
 *   "Activity 状態: ${hint.label}" → "${hint.label} — Activity 状態"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-activity-log-hint-em-dash-iter1557.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/activity-log.tsx'), 'utf8')

  if (!src.includes('aria-label={`${hint.label} — Activity 状態`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'activity-log-hint aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`Activity 状態: ${hint.label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'activity-log-hint 旧 colon 形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — activity-log-hint chip aria-label が em-dash 形式')
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
