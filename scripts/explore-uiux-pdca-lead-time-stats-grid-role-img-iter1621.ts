/**
 * Phase 6.15 loop iter1621: pdca-panel Lead time 統計 grid (平均 / 中央値 / P95) を atomic chip
 * pattern (role="img" + 集約 aria-label + 内側 LeadStat aria-hidden) に migration。
 *
 * iter1620 mature 報告で recommend された non-em-dash a11y 軸 ((i)(ii)(iii)) の (ii) "stat
 * grouping" に該当: 旧 grid は dt/dd 構造を持たない単純 div 3 枚で SR が "平均", "0", "日",
 * "中央値", "0", "日", "P95", "0", "日" と 9 piece に分解読み上げする UX gap。
 *
 * 修正 (pdca-panel.tsx):
 *   - 親 grid div に `role="img"` + aria-label `Lead time 内訳 — 平均 X 日 / 中央値 Y 日 / P95 Z 日`
 *   - LeadStat 内側 div に `aria-hidden="true"` (重複読み上げ抑止)
 *   → cycle-check-stats-card iter1081 + iter1574 sweep と同 atomic chip pattern で統一
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-pdca-lead-time-stats-grid-role-img-iter1621.ts
 * 前提: dev server + supabase 起動。なければ source 直読 invariant のみ。
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
  const src = readFileSync(resolve(here, '../src/components/workspace/pdca-panel.tsx'), 'utf8')

  // 1. 親 grid に role="img" + aria-label `Lead time 内訳 — ...` が付いていること
  if (
    !/role="img"\s*\n\s*aria-label=\{`Lead time 内訳 — 平均 \$\{leadTimeDays\.avg\} 日 \/ 中央値 \$\{leadTimeDays\.p50\} 日 \/ P95 \$\{leadTimeDays\.p95\} 日`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'pdca-panel Lead time stats grid に role="img" + 集約 aria-label が無い',
    })
  }

  // 2. LeadStat の outer div に aria-hidden="true" が付いていること
  if (!/<div className="rounded border p-2 text-center" aria-hidden="true">/.test(src)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'LeadStat outer div に aria-hidden="true" が無い (親 grid の aria-label が重複読み上げされる)',
    })
  }

  // 3. 旧 grid (role 無し / aria-label 無し) が残存していないこと
  if (/<div className="grid grid-cols-3 gap-2">\s*\n\s*<LeadStat label="平均"/.test(src)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'pdca-panel Lead time stats grid に旧 unlabeled div pattern が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — pdca-panel Lead time stats grid が atomic chip pattern (role=img + aria-label + 子 aria-hidden)',
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
