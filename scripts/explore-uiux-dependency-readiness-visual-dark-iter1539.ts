/**
 * Phase 6.15 loop iter1539: features/item-dependency/readiness.ts TONE_VISUAL 3 tone に
 * dark variant を補完 (mode-D contrast、iter1376/1493/1512-1538 chip dark sweep の central
 * feature 7 件目)。
 *
 * readiness.ts は ItemDependenciesPanel + ItemEditDialog の依存 tab で各 item の依存状態
 * (blocked/idle/ready) を icon + 配色で先頭描画する graphical config を提供。3 visual 全てが
 * `bg-{color}-50 text-{color}-{700,900} ring-{color}-200` で light 固定、iter1376/1493/
 * 1512-1538 chip dark sweep の central feature 7 件目着地。
 *
 * 修正 (readiness.ts):
 *   blocked (amber): + dark token
 *   idle (zinc): + dark token
 *   ready (emerald): + dark token
 *
 * test invariant (readiness.test.ts、20 ケース):
 *   tone/iconKey logic 中心で class string check なし、dark variant 追加に透過、全 pass 確認。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dependency-readiness-visual-dark-iter1539.ts
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
  const src = readFileSync(resolve(here, '../src/features/item-dependency/readiness.ts'), 'utf8')

  const checks: Array<[string, string]> = [
    ['blocked bg', "bgClass: 'bg-amber-50 dark:bg-amber-950/30'"],
    ['blocked text', "textClass: 'text-amber-900 dark:text-amber-200'"],
    ['idle bg', "bgClass: 'bg-zinc-50 dark:bg-zinc-900/30'"],
    ['idle text', "textClass: 'text-zinc-700 dark:text-zinc-300'"],
    ['ready bg', "bgClass: 'bg-emerald-50 dark:bg-emerald-950/30'"],
    ['ready text', "textClass: 'text-emerald-900 dark:text-emerald-200'"],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `readiness.ts TONE_VISUAL.${name} に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — readiness.ts TONE_VISUAL 3 tone (blocked/idle/ready) に dark variant 補完済',
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
