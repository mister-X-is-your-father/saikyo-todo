/**
 * Phase 6.15 loop iter1562: estimate-bias-insight 傾向 chip aria-label を visible 冒頭 em-dash 形式に
 * migration (iter1093-1561 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"傾向: ${label}"` は visible "${label}" (e.g., "過大" / "過小" / "妥当") を
 * 末尾に持ち voice control prefix-matching「click 過大」 が strict prefix-match で不可
 * (substring 一致のみ)。iter1553-1561 status/role/health Badge family と同 pattern、visible
 * 冒頭固定 + em-dash 区切。
 *
 * 修正 (estimate-bias-insight.tsx):
 *   `傾向: ${label}` → `${label} — 傾向`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-estimate-bias-tendency-em-dash-iter1562.ts
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
    resolve(here, '../src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${label} — 傾向`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'estimate-bias-insight 傾向 chip aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`傾向: ${label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'estimate-bias-insight 傾向 chip 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — estimate-bias-insight 傾向 chip aria-label が em-dash 形式 (visible 冒頭固定)',
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
