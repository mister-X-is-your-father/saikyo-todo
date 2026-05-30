/**
 * Phase 6.15 loop iter1526: quick-add scheduledFor chip (blue) + weekly-insight anomaly chip
 * 2 tone (emerald positive / amber negative) に dark variant を補完 (mode-D contrast、
 * iter1376/1493/1512-1525 chip dark sweep の残箇所 3 chip)。
 *
 * 修正:
 *   quick-add.tsx (line 211): scheduledFor chip blue
 *     `bg-blue-100 text-blue-700` → + `dark:bg-blue-950/40 dark:text-blue-300`
 *   weekly-insight-widget.tsx (line 233-234): anomaly chip 2 tone
 *     positive emerald: `bg-emerald-50 text-emerald-800` → + `dark:bg-emerald-950/30 dark:text-emerald-200`
 *     negative amber:   `bg-amber-50 text-amber-800` → + `dark:bg-amber-950/30 dark:text-amber-200`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quickadd-weekly-anomaly-chip-dark-iter1526.ts
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
  const qa = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')
  const wi = readFileSync(
    resolve(here, '../src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )

  if (
    !qa.includes('bg-blue-100 px-1.5 py-0.5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add scheduledFor chip blue に dark variant が無い',
    })
  }
  if (
    !wi.includes("'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'weekly-insight anomaly chip emerald positive に dark variant が無い',
    })
  }
  if (!wi.includes("'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'weekly-insight anomaly chip amber negative に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — quick-add scheduledFor + weekly-insight anomaly 2 tone に dark variant 補完済',
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
