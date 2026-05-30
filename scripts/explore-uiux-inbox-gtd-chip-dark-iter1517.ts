/**
 * Phase 6.15 loop iter1517: inbox-view GTD 3 chip (immediate/project/next-action) に dark
 * variant を補完 (mode-D contrast、iter1376/1493/1512-1516 chip pattern を本 3 chip に展開)。
 *
 * inbox-view の GTD summary 内 3 chip:
 *   immediate (2 分以内): emerald-300/50/700
 *   project (Project):    sky-300/50/700
 *   next-action:          slate-300/50/700
 *
 * 全 3 chip が light 固定描画、dark mode で明色 chip 浮き contrast 不適。
 * iter1376/1493/1512-1516 chip dark variant pattern を本 3 chip にも展開。
 *
 * 修正 (inbox-view.tsx):
 *   immediate:   + dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300
 *   project:     + dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300
 *   next-action: + dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-inbox-gtd-chip-dark-iter1517.ts
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
  const filePath = resolve(here, '../src/components/workspace/inbox-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  const checks: Array<[string, string]> = [
    [
      'immediate',
      'border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
    ],
    [
      'project',
      'border-sky-300 bg-sky-50 px-1.5 py-0.5 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300',
    ],
    [
      'next-action',
      'border-slate-300 bg-slate-50 px-1.5 py-0.5 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300',
    ],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `inbox-view GTD chip ${name} に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — inbox-view GTD 3 chip (immediate/project/next-action) に dark variant 補完済',
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
