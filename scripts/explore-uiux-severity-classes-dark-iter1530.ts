/**
 * Phase 6.15 loop iter1530: lib/widget/severity SEVERITY_CLASSES 5 severity 4 軸に dark
 * variant を補完 (mode-D contrast、iter1376/1493/1512-1529 chip dark sweep の central
 * widget vocabulary 着地)。
 *
 * SEVERITY_CLASSES は SeverityChip を始めとする全 widget の border/bg/text/ring 4 軸
 * 配色を提供する central feature。5 severity × 4 軸 = 20 token 全てが light 固定、
 * iter1376/1493/1512-1529 chip dark sweep からこぼれていた。
 *
 * 修正 (severity.ts):
 *   ok / info / warn / danger / muted 5 severity の border/bg/text/ring 4 軸全てに dark token
 *   併記。pattern:
 *     border: `border-{color}-300 dark:border-{color}-{700-900}/50`
 *     bg: `bg-{color}-{50,100} dark:bg-{color}-{900-950}/30`
 *     text: `text-{color}-{600,700} dark:text-{color}-{300,400}`
 *     ring: `ring-{color}-200 dark:ring-{color}-{700-900}/50`
 *
 * test invariant (severity.test.ts、36 ケース):
 *   `^border-` / `^bg-` / `^text-` prefix 正規表現 + `.toContain('emerald')` 形式の substring
 *   check で dark variant 追加に透過、全 pass。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-severity-classes-dark-iter1530.ts
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
  const src = readFileSync(resolve(here, '../src/lib/widget/severity.ts'), 'utf8')

  const checks: Array<[string, string]> = [
    ['ok bg', "bg: 'bg-emerald-50 dark:bg-emerald-950/30'"],
    ['ok text', "text: 'text-emerald-700 dark:text-emerald-300'"],
    ['info bg', "bg: 'bg-sky-50 dark:bg-sky-950/30'"],
    ['info text', "text: 'text-sky-700 dark:text-sky-300'"],
    ['warn bg', "bg: 'bg-amber-50 dark:bg-amber-950/30'"],
    ['warn text', "text: 'text-amber-700 dark:text-amber-300'"],
    ['danger bg', "bg: 'bg-rose-50 dark:bg-rose-950/30'"],
    ['danger text', "text: 'text-rose-700 dark:text-rose-300'"],
    ['muted bg', "bg: 'bg-slate-100 dark:bg-slate-900/30'"],
    ['muted text', "text: 'text-slate-600 dark:text-slate-400'"],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `severity.ts SEVERITY_CLASSES.${name} に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — severity.ts SEVERITY_CLASSES 5 severity × bg/text に dark variant 補完済')
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
