/**
 * Phase 6.15 loop iter1660: personal-period-view 「${X}の Item (${N})」 paren convention を
 * em-dash 区切に統一。iter1656 today-view group heading sweep の続き。
 *
 *   旧: `${periodLabelJa(period)}の Item ({filtered.length})`
 *   新: `${periodLabelJa(period)}の Item — {filtered.length} 件`
 *
 * Playwright で `?view=daily` の `[id^="period-items-heading-"]` textContent が
 * `"日次の Item — 2 件"` 着地を直接 verify。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-period-heading-em-dash-iter1660.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )

  if (!src.includes('{periodLabelJa(period)}の Item — {filtered.length} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'personal-period-view heading が em-dash convention に未着地',
    })
  }
  // 旧 paren が code 行 (comment 除外) に残存していない
  const codeLine = src
    .split('\n')
    .find((l) => /^\s+\{periodLabelJa\(period\)\}の Item \(\{filtered\.length\}\)\s*$/.test(l))
  if (codeLine) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention が code 行に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — personal-period-view heading が em-dash convention で統一')
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
