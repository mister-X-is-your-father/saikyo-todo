/**
 * Phase 6.15 loop iter1675 (mode-M mobile audit): budget-panel 編集 form の 2 Input
 * (budget-limit / budget-warn) が shadcn Input default `h-9` (36px) で WCAG 2.5.5 違反
 * (44x44 minimum tap target) になる可能性があったのを `h-11` (44px) に統一。
 *
 * Budget panel は現在まだ UI に組み込まれていないが、将来組込まれた時の mobile UX を
 * 担保 (iter1647/iter1649/iter1651 と同 sweep)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-budget-h11-iter1675.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')

  for (const id of ['budget-limit', 'budget-warn']) {
    const idx = src.indexOf(`id="${id}"`)
    if (idx === -1) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `Input id="${id}" が見つからない`,
      })
      continue
    }
    const slice = src.slice(idx, idx + 300)
    if (!slice.includes('className="h-11"')) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `Input id="${id}" に className="h-11" が無い (WCAG 2.5.5)`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — budget-panel 2 Input が h-11')
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
