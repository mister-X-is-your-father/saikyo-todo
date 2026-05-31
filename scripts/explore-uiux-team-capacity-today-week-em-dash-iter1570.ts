/**
 * Phase 6.15 loop iter1570: team-capacity-panel 今日 / 今週 chip aria-label を em-dash 区切に
 * migration (iter1093-1569 sweep convention 着地)。
 *
 * 旧 aria-label `"今日: ${loadJa}"` / `"今週: ${loadJa}"` は ':' colon 区切で iter1093-1569 sweep の
 * em-dash convention と divergent。visible "今日" / "今週" は元から冒頭 prefix (voice control OK)、
 * 区切のみ em-dash 化で convention 統一。同 file 内 member 名 chip (iter1557) と sibling 関係。
 *
 * 修正 (team-capacity-panel.tsx):
 *   `今日: ${loadJa}` → `今日 — ${loadJa}`
 *   `今週: ${loadJa}` → `今週 — ${loadJa}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-team-capacity-today-week-em-dash-iter1570.ts
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
    resolve(here, '../src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`今日 — ${formatMemberCapacityLoadJa(today)}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity 今日 chip aria-label が em-dash 区切でない',
    })
  }
  if (!src.includes('aria-label={`今週 — ${formatMemberCapacityLoadJa(week)}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity 今週 chip aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`今日: ${formatMemberCapacityLoadJa(today)}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity 今日 chip 旧 colon 区切 aria-label が残存',
    })
  }
  if (src.includes('aria-label={`今週: ${formatMemberCapacityLoadJa(week)}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity 今週 chip 旧 colon 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — team-capacity 今日 / 今週 chip aria-label が em-dash 区切')
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
