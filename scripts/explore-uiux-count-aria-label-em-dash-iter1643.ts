/**
 * Phase 6.15 loop iter1643: list 親 ul/ol 3 件追加 sweep。iter1633/iter1640 の補完。
 *
 *   - activity-log.tsx        Activity 履歴 ${N} 件
 *   - taskchute-view.tsx      今日の task を時刻昇順で並べた 1 列 timeline ${N} 件
 *   - schedule-item-picker    検索結果 ${N} 件
 *
 * iter1633/iter1640 で sweep した 11 file 11 entries の続き、再 grep で残存していた
 * 3 件を em-dash に統一。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-count-aria-label-em-dash-iter1643.ts
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

  const cases = [
    {
      path: '../src/components/workspace/activity-log.tsx',
      mustContain: 'aria-label={`Activity 履歴 — ${data.length} 件`}',
    },
    {
      path: '../src/components/workspace/taskchute-view.tsx',
      mustContain:
        'aria-label={`今日の task を時刻昇順で並べた 1 列 timeline — ${ordered.length} 件`}',
    },
    {
      path: '../src/components/schedule/schedule-item-picker.tsx',
      mustContain: 'aria-label={`検索結果 — ${filtered.length} 件`}',
    },
  ]

  for (const c of cases) {
    const src = readFileSync(resolve(here, c.path), 'utf8')
    if (!src.includes(c.mustContain)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${c.path}: em-dash convention 未着地`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 3 list aria-label が em-dash convention で統一')
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
