/**
 * Phase 6.15 loop iter1521: active-timer-panel estimate chip + quick-add preview 2 chip
 * (emerald 見積 + cyan tags 系) に dark variant を補完 (mode-D contrast、
 * iter1376/1493/1512-1520 chip pattern を本 3 chip に展開、複数 file 跨ぐ)。
 *
 * 修正:
 *   active-timer-panel.tsx (line 191): estimate chip cyan
 *     `bg-cyan-100 text-cyan-700` → + `dark:bg-cyan-950/40 dark:text-cyan-300`
 *   quick-add.tsx (line 241): tag chip emerald (見積)
 *     `bg-emerald-100 text-emerald-700` → + `dark:bg-emerald-950/40 dark:text-emerald-300`
 *   quick-add.tsx (line 252): tag chip cyan (tags)
 *     `bg-cyan-100 text-cyan-700` → + `dark:bg-cyan-950/40 dark:text-cyan-300`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-timer-quickadd-chips-dark-iter1521.ts
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
  const atp = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  const qa = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')

  if (
    !atp.includes(
      'bg-cyan-100 px-1 text-[9px] text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer-panel estimate chip に dark variant が無い',
    })
  }
  if (
    !qa.includes(
      'bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add 見積 chip emerald に dark variant が無い',
    })
  }
  if (
    !qa.includes('bg-cyan-100 px-1.5 py-0.5 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add tags chip cyan に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — active-timer estimate + quick-add emerald/cyan chip に dark variant 補完済',
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
