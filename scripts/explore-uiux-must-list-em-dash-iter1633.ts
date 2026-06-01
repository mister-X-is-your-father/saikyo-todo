/**
 * Phase 6.15 loop iter1633: dashboard-view MUST Item 一覧 region Card aria-label の
 * `${entity} 一覧 ${N} 件` space-separator を iter1093-1631 sweep の em-dash 区切に統一。
 *
 * iter1626 (StatCard) / iter1628 (DashboardChip) / iter1629 (src/app landmark) / iter1631
 * (src/app sub-page) sweep の補完。dashboard-view 内に残存していた space-separator 1 件
 * (line 1387 MUST Item 一覧 Card region) を em-dash 化。visible CardTitle "MUST Item 一覧"
 * を冒頭固定で voice control prefix-match「click MUST Item 一覧」維持しつつ、count chip
 * 同 file 内の Dashboard 健全性 chip 群 / StatCard と convention 統一。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-must-list-em-dash-iter1633.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/dashboard-view.tsx'), 'utf8')

  if (!src.includes('aria-label={`MUST Item 一覧 — ${s.items.length} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'MUST Item 一覧 Card aria-label が em-dash convention に未着地',
    })
  }

  // 旧 space-separator が code 行 (comment 除外、aria-label= で始まる) に残存していない
  const aria = src
    .split('\n')
    .find((l) => /aria-label=\{`MUST Item 一覧 \$\{s\.items\.length\} 件`\}/.test(l))
  if (aria) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'MUST Item 一覧 aria-label に旧 space-separator が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — MUST Item 一覧 Card aria-label が em-dash convention で統一')
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
