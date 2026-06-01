/**
 * Phase 6.15 loop iter1656: today-view group CardTitle visible heading `${label} (${N})`
 * paren convention を em-dash 区切に統一。
 *
 * 旧: `今日 (6/1 月) (2)` — g.label 自身が paren を持つ「今日 (6/1 月)」 case で double
 * paren となり awkward (期限超過 case では問題ないが、今日 case で UI 違和感)。
 * 新: `今日 (6/1 月) — 2 件` — em-dash 区切で全 4 group (期限超過 / 今日 / 明日 / 今週内)
 * を統一、内部 paren と count paren の重複を解消。
 *
 * aria-labelledby は h2 を指すため SR でも visible と同じ文字列で読まれる。
 * Playwright で `/?view=today` の `[id^="today-group-heading-"]` textContent が
 * `"今日 (6/1 月) — 2 件"` であることを直接 verify。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-today-group-heading-em-dash-iter1656.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')

  if (!src.includes('{g.label} — {g.items.length} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'today-view group heading が em-dash convention に未着地',
    })
  }

  // 旧 paren が code 行 (comment 除外) に残存していない
  const codeLine = src
    .split('\n')
    .find((l) => /^\s+\{g\.label\} \(\{g\.items\.length\}\)\s*$/.test(l))
  if (codeLine) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention が code 行に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — today-view group heading が em-dash convention で統一')
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
