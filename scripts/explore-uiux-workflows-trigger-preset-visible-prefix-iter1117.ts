/**
 * Phase 6.15 loop iter1117: workflows-panel 4 trigger preset button (manual/cron/item-event/webhook)
 * aria-label visible-prefix regression guard。
 *
 * iter1117 で発見した bug: 4 button の旧 aria-label "trigger を {kind} (...) に切替" は visible
 * "manual"/"cron"/"item-event"/"webhook" を中位置持ち、voice control prefix-matching match 不可。
 * iter1035 で 6 node preset button は visible-prefix 化 (iter1035) されているが trigger preset は
 * 漏れていた。
 *
 * 修正 (workflows-panel.tsx) — 4 path visible-prefix:
 *   - manual: "manual — trigger を manual (手動実行のみ) に切替"
 *   - cron: "cron — trigger を cron (毎日 09:00 等) に切替"
 *   - item-event: "item-event — trigger を item-event (...) に切替"
 *   - webhook: "webhook — trigger を webhook (...) に切替"
 *
 * 実 supabase + workflow fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflows-trigger-preset-visible-prefix-iter1117.ts
 * 前提: なし
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
  const filePath = resolve(here, '../src/components/workflow/workflows-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    '"manual — trigger を manual (手動実行のみ) に切替"',
    '"cron — trigger を cron (毎日 09:00 等) に切替"',
    '"item-event — trigger を item-event (create / update / status_change / complete) に切替"',
    '"webhook — trigger を webhook (POST /api/workflows/webhook/<secret>) に切替"',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workflows-panel trigger preset に visible-prefix '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflows-panel 4 trigger preset aria-label は visible-prefix 配置済')
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
