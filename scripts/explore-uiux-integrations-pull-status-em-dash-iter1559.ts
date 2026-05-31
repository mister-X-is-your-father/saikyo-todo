/**
 * Phase 6.15 loop iter1559: integrations-panel ImportStatusBadge (Pull ステータス) aria-label を
 * visible 冒頭 em-dash 形式に migration (iter1093-1558 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"Pull ステータス: ${label}"` は visible "${label}" (e.g., "成功" / "失敗" / "保留") を
 * 末尾に持ち voice control prefix-matching「click 成功」 が strict prefix-match で不可
 * (substring 一致のみ)。iter1553-1558 status/role Badge family と同 pattern、visible 冒頭固定 +
 * em-dash 区切。
 *
 * 修正 (integrations-panel.tsx):
 *   `Pull ステータス: ${label}` → `${label} — Pull ステータス`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-integrations-pull-status-em-dash-iter1559.ts
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
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${label} — Pull ステータス`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations ImportStatusBadge aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`Pull ステータス: ${label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations ImportStatusBadge 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — integrations ImportStatusBadge aria-label が em-dash 形式 (visible 冒頭固定)',
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
