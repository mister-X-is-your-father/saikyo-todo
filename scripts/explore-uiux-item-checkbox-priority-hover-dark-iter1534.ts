/**
 * Phase 6.15 loop iter1534: item-checkbox PRIORITY_CLASS 4 priority の hover bg に dark
 * variant を補完 (mode-D contrast、iter1376/1493/1512-1533 chip dark sweep の hover state 着地)。
 *
 * ItemCheckbox の PRIORITY_CLASS は 4 priority (1-4) ごとに border / hover bg / checked bg
 * を定義。hover:bg-{color}-50/100 は light 固定で dark mode で hover state が明色のまま
 * 浮く (light hover が dark bg にしみる)。dark:hover:bg-{color}-950/30 を併記。
 *
 * border は -500 mid-shade で theme 中間色のため touch なし、checked bg も -500 で同様。
 *
 * 修正 (item-checkbox.tsx):
 *   p1: hover:bg-red-50    + dark:hover:bg-red-950/30
 *   p2: hover:bg-amber-50  + dark:hover:bg-amber-950/30
 *   p3: hover:bg-blue-50   + dark:hover:bg-blue-950/30
 *   p4: hover:bg-slate-100 + dark:hover:bg-slate-900/30
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-item-checkbox-priority-hover-dark-iter1534.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/item-checkbox.tsx'), 'utf8')

  const checks: Array<[string, string]> = [
    ['p1', 'hover:bg-red-50 dark:hover:bg-red-950/30'],
    ['p2', 'hover:bg-amber-50 dark:hover:bg-amber-950/30'],
    ['p3', 'hover:bg-blue-50 dark:hover:bg-blue-950/30'],
    ['p4', 'hover:bg-slate-100 dark:hover:bg-slate-900/30'],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `item-checkbox PRIORITY_CLASS.${name} hover に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — item-checkbox PRIORITY_CLASS 4 priority の hover bg に dark variant 補完済',
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
