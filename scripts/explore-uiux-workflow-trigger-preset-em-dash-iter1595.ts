/**
 * Phase 6.15 loop iter1595: workflows-panel trigger プリセット group landmark aria-label paren を
 * em-dash 区切に migration (iter1093-1594 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"trigger プリセット (4 種: manual / cron / item-event / webhook、JSON に 1 click 投入)"` は
 * iter1093-1594 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、内部 colon は
 * space、closing ')' は削除。
 *
 * 修正 (workflows-panel.tsx):
 *   `trigger プリセット (4 種: manual / cron / item-event / webhook、JSON に 1 click 投入)`
 *   → `trigger プリセット — 4 種 manual / cron / item-event / webhook、JSON に 1 click 投入`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-trigger-preset-em-dash-iter1595.ts
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
  const src = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')

  if (
    !src.includes(
      'aria-label="trigger プリセット — 4 種 manual / cron / item-event / webhook、JSON に 1 click 投入"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel trigger プリセット group aria-label が em-dash 区切でない',
    })
  }
  if (
    src.includes(
      'aria-label="trigger プリセット (4 種: manual / cron / item-event / webhook、JSON に 1 click 投入)"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel trigger プリセット group 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflows-panel trigger プリセット group aria-label が em-dash 区切')
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
