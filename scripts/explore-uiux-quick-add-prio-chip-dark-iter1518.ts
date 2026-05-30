/**
 * Phase 6.15 loop iter1518: quick-add PRIO_COLOR 4 階調 chip に dark variant を補完
 * (mode-D contrast、iter1376/1493/1512-1517 chip pattern を本 4 階調 priority chip に展開)。
 *
 * quick-add の PRIO_COLOR map は priority 1-4 ごとに `bg-{color}-100 text-{color}-700` を
 * 定義 (1=red 最高 / 2=amber / 3=blue / 4=slate 最低)。4 階調全て light 固定描画、dark mode で
 * 明色 chip 浮き contrast 不適。iter1517 inbox-view GTD chip と同 root pattern。
 *
 * 修正 (quick-add.tsx):
 *   p1: `bg-red-100 text-red-700`     → + `dark:bg-red-950/40 dark:text-red-300`
 *   p2: `bg-amber-100 text-amber-700` → + `dark:bg-amber-950/40 dark:text-amber-300`
 *   p3: `bg-blue-100 text-blue-700`   → + `dark:bg-blue-950/40 dark:text-blue-300`
 *   p4: `bg-slate-100 text-slate-700` → + `dark:bg-slate-900/40 dark:text-slate-300`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quick-add-prio-chip-dark-iter1518.ts
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
  const filePath = resolve(here, '../src/components/workspace/quick-add.tsx')
  const src = readFileSync(filePath, 'utf8')

  const checks: Array<[string, string]> = [
    ['p1', "1: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'"],
    ['p2', "2: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'"],
    ['p3', "3: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'"],
    ['p4', "4: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300'"],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `quick-add PRIO_COLOR.${name} に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — quick-add PRIO_COLOR 4 階調 chip に dark variant 補完済')
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
