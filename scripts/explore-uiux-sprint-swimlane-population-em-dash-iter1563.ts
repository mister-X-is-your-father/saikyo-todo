/**
 * Phase 6.15 loop iter1563: sprint-swimlane-disclosure population chip aria-label を visible 冒頭
 * em-dash 形式に migration (iter1093-1562 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"Sprint 全体: ${populationLabel}"` は visible "${populationLabel}" を末尾に持ち
 * voice control prefix-matching が strict prefix-match で不可 (substring 一致のみ)。iter1553-1562
 * status/role/health/傾向 chip family と同 pattern、visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (sprint-swimlane-disclosure.tsx):
 *   `Sprint 全体: ${populationLabel}` → `${populationLabel} — Sprint 全体`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-swimlane-population-em-dash-iter1563.ts
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

  if (!src.includes('aria-label={`${populationLabel} — Sprint 全体`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-swimlane population chip aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`Sprint 全体: ${populationLabel}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-swimlane population chip 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — sprint-swimlane population chip aria-label が em-dash 形式 (visible 冒頭固定)',
    )
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
