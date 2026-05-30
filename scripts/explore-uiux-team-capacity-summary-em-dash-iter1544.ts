/**
 * Phase 6.15 loop iter1544: team-capacity-panel summary aria-label を em-dash 形式に migration
 * (sprint-swimlane summary iter1042 と同 pattern、iter1093-1543 sweep convention 着地)。
 *
 * 旧 aria-label `'チームメンバー 余裕時間 (今日 / 今週) を{閉じる|開く}'` は ' を' 助詞接続で
 * iter1093-1543 sweep の em-dash 区切と divergent。
 *
 * 修正 (team-capacity-panel.tsx):
 *   `'... (今日 / 今週) を閉じる'` → `'... (今日 / 今週) — 閉じる'`
 *   `'... (今日 / 今週) を開く'`  → `'... (今日 / 今週) — 開く'`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-team-capacity-summary-em-dash-iter1544.ts
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
    resolve(here, '../src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )

  if (!src.includes("'チームメンバー 余裕時間 (今日 / 今週) — 閉じる'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity-panel summary 閉じる aria-label が em-dash 形式でない',
    })
  }
  if (!src.includes("'チームメンバー 余裕時間 (今日 / 今週) — 開く'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity-panel summary 開く aria-label が em-dash 形式でない',
    })
  }
  if (src.includes("'チームメンバー 余裕時間 (今日 / 今週) を閉じる'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity-panel summary 旧 " を閉じる" が残存',
    })
  }
  if (src.includes("'チームメンバー 余裕時間 (今日 / 今週) を開く'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity-panel summary 旧 " を開く" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — team-capacity-panel summary 両 path aria-label が em-dash 形式')
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
