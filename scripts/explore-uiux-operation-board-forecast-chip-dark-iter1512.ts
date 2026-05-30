/**
 * Phase 6.15 loop iter1512: operation-board-widget forecast chip sevCls 4 階調に dark variant
 * を補完 (mode-D contrast、iter1376 RecoveryPlanSection / iter1493 data-widget-card pattern を
 * forecast chip にも展開)。
 *
 * operation-board の 「今日完了予測」 chip は sevCls 4 階調 (ok/info/warn/danger) を
 * `bg-{color}-50 text-{color}-700` で light 固定描画。dark mode では明色 box が dark page 上に
 * 浮き、emerald-700 等の text 色も dark bg では contrast 不適。iter1376 / iter1493 で確立済の
 * `dark:bg-{color}-950/30` + `dark:text-{color}-300` pattern を本 chip にも展開。
 *
 * 修正 (operation-board-widget.tsx):
 *   ok:     `bg-emerald-50 text-emerald-700`
 *         → `bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300`
 *   info:   `bg-sky-50 text-sky-700`
 *         → `bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300`
 *   warn:   `bg-amber-50 text-amber-700`
 *         → `bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300`
 *   danger: `bg-rose-50 text-rose-700`
 *         → `bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-operation-board-forecast-chip-dark-iter1512.ts
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
  const filePath = resolve(here, '../src/components/workspace/operation-board-widget.tsx')
  const src = readFileSync(filePath, 'utf8')

  const checks: Array<[string, string]> = [
    ['ok', "'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'"],
    ['info', "'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'"],
    ['warn', "'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'"],
    ['danger', "'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'"],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `forecast chip sevCls.${name} に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — operation-board forecast chip 4 sevCls に dark variant 補完済 (iter1376/1493 pattern 展開)',
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
