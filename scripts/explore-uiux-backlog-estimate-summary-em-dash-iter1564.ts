/**
 * Phase 6.15 loop iter1564: backlog-view estimate-summary chip aria-label を visible 冒頭
 * em-dash 形式に migration (iter1093-1563 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"Backlog 見積サマリ: ${estimateSummary}"` は visible "${estimateSummary}" を
 * 末尾に持ち voice control prefix-matching が strict prefix-match で不可 (substring 一致のみ)。
 * iter1553-1563 status/role/health/傾向 chip family と同 pattern、visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (backlog-view.tsx):
 *   `Backlog 見積サマリ: ${estimateSummary}` → `${estimateSummary} — Backlog 見積サマリ`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-backlog-estimate-summary-em-dash-iter1564.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/backlog-view.tsx'), 'utf8')

  if (!src.includes('aria-label={`${estimateSummary} — Backlog 見積サマリ`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog-view estimate-summary aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`Backlog 見積サマリ: ${estimateSummary}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog-view estimate-summary 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — backlog-view estimate-summary aria-label が em-dash 形式 (visible 冒頭固定)',
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
