/**
 * Phase 6.15 loop iter1662: operation-board-widget Quick wins / 集中ブロック h3 heading
 * `${X} (${N})` paren convention を em-dash 区切に統一。iter1656/iter1660 sweep の続編。
 *
 *   旧: `Quick wins (3)` / `集中ブロック (2)`
 *   新: `Quick wins — 3 件` / `集中ブロック — 2 件`
 *
 * aria-labelledby は h3 を指すため SR / visible 両方で convention 整合。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-op-board-heading-em-dash-iter1662.ts
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
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  if (!src.includes('Quick wins — {forecast.quickWins.length} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Quick wins heading が em-dash convention に未着地',
    })
  }
  if (!src.includes('集中ブロック — {forecast.focusBlocks.length} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '集中ブロック heading が em-dash convention に未着地',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — operation-board Quick wins / 集中ブロック heading が em-dash 統一')
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
