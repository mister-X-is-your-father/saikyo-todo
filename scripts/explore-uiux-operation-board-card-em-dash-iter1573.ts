/**
 * Phase 6.15 loop iter1573: operation-board-widget Card region aria-label を em-dash 区切に
 * migration (iter1093-1572 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"今日の作戦盤 (期限超過 X / MUST Y / 今日予定 Z)"` は iter1093-1572
 * sweep の em-dash 区切と divergent。visible "今日の作戦盤" は元から冒頭 prefix (voice control OK)、
 * 区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (operation-board-widget.tsx):
 *   `今日の作戦盤 (期限超過 X 件 / 今日 MUST Y 件 / 今日予定 Z 件)`
 *   → `今日の作戦盤 — 期限超過 X 件 / 今日 MUST Y 件 / 今日予定 Z 件`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-operation-board-card-em-dash-iter1573.ts
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
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`今日の作戦盤 — 期限超過 ${board.overdue.total}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board Card region aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`今日の作戦盤 (期限超過 ${board.overdue.total}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board Card region 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — operation-board Card region aria-label が em-dash 区切')
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
