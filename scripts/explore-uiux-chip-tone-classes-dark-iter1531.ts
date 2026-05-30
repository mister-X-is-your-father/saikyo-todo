/**
 * Phase 6.15 loop iter1531: lib/ui/chip-tone TONE_CLASSES 6 tone × 3 軸に dark variant を
 * 補完 (mode-D contrast、iter1376/1493/1512-1530 chip dark sweep の central vocabulary 3 件目
 * 着地)。
 *
 * TONE_CLASSES は ChipTone (danger/urgent/warn/info/idle/success) × bg/text/ring 3 軸の
 * Tailwind class を提供する central vocabulary。SeverityChip と並ぶ全 widget 描画の源泉。
 * 6 tone × 3 軸 = 18 token 全てが light 固定、iter1376/1493/1512-1530 chip dark sweep の
 * central vocabulary 3 件目 (MUST badge iter1528 / status-visual iter1529 / severity iter1530
 * と並ぶ高 leverage 着地)。
 *
 * 修正 (chip-tone.ts):
 *   各 tone に dark token 併記。pattern:
 *     bg: `bg-{color}-{50,100} dark:bg-{color}-{900-950}/{30,40}`
 *     text: `text-{color}-{600,700,800} dark:text-{color}-{200,300,400}`
 *     ring: `ring-{color}-{200,300} dark:ring-{color}-{700-900}/50`
 *
 * 連動更新 (chip-tone.test.ts):
 *   厳密 `.toBe()` 形式の expected strings (6 件) を新形式に migration。
 *   テスト意図 (light 配色 token が変わらず維持) は新形式の light 部分で satisfy。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-chip-tone-classes-dark-iter1531.ts
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
  const src = readFileSync(resolve(here, '../src/lib/ui/chip-tone.ts'), 'utf8')

  const checks: Array<[string, string]> = [
    ['danger bg', "bgClass: 'bg-rose-100 dark:bg-rose-950/40'"],
    ['danger text', "textClass: 'text-rose-700 dark:text-rose-300'"],
    ['urgent bg', "bgClass: 'bg-amber-100 dark:bg-amber-950/40'"],
    ['urgent text', "textClass: 'text-amber-800 dark:text-amber-200'"],
    ['warn bg', "bgClass: 'bg-amber-50 dark:bg-amber-950/30'"],
    ['warn text', "textClass: 'text-amber-700 dark:text-amber-300'"],
    ['info bg', "bgClass: 'bg-blue-50 dark:bg-blue-950/30'"],
    ['info text', "textClass: 'text-blue-700 dark:text-blue-300'"],
    ['idle bg', "bgClass: 'bg-slate-50 dark:bg-slate-900/30'"],
    ['idle text', "textClass: 'text-slate-600 dark:text-slate-400'"],
    ['success bg', "bgClass: 'bg-emerald-50 dark:bg-emerald-950/30'"],
    ['success text', "textClass: 'text-emerald-700 dark:text-emerald-300'"],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `chip-tone.ts TONE_CLASSES.${name} に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — chip-tone.ts TONE_CLASSES 6 tone × bg/text に dark variant 補完済')
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
