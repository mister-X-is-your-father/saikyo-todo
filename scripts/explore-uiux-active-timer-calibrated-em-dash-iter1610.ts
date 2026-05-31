/**
 * Phase 6.15 loop iter1610: active-timer-panel calibrated chip aria-label を visible 冒頭 em-dash 形式に
 * migration (iter1605 quick-add estimate と同 pattern、iter1553-1609 visible 冒頭 em-dash sweep
 * convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"校正後 ${calibratedMinutes}分 — ..."` は visible "→ ${calibratedMinutes}分" の
 * text 部 を 中位置 (`校正後 **30分**`) に持ち voice control prefix-matching「click 30分」 が
 * strict prefix-match で不可。iter1605 quick-add estimate と同 pattern、visible (icon 抜き) 冒頭
 * 固定 + em-dash 区切。
 *
 * 修正 (active-timer-panel.tsx):
 *   `校正後 ${calibratedMinutes}分 — ${delta}` → `${calibratedMinutes}分 — 校正後 ${delta}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-active-timer-calibrated-em-dash-iter1610.ts
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
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${calibrated.calibratedMinutes}分 — 校正後 ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer calibrated chip aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`校正後 ${calibrated.calibratedMinutes}分 — ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer calibrated chip 旧 aria-label (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — active-timer calibrated chip aria-label が em-dash 形式 (visible 冒頭固定)',
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
