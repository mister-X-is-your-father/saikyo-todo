/**
 * Phase 6.15 loop iter1560: activity-log action-icon chip aria-label を
 * visible 冒頭 em-dash 形式に migration (iter1093-1559 sweep convention 着地)。
 *
 * 旧 aria-label `"操作種別: ${label}"` は ':' colon 区切で visible "${label}" を末尾に持ち
 * voice control prefix-matching「click ${label}」 が strict prefix-match で不可。
 * iter1553-1559 status/role Badge family と同 pattern、visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (activity-log.tsx):
 *   "操作種別: ${label}" → "${label} — 操作種別"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-activity-log-action-em-dash-iter1560.ts
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

  if (!src.includes('aria-label={`${label} — 操作種別`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'activity-action-icon aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`操作種別: ${label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'activity-action-icon 旧 colon 形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — activity-action-icon chip aria-label が em-dash 形式')
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
