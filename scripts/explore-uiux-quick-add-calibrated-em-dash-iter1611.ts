/**
 * Phase 6.15 loop iter1611: quick-add calibrated chip aria-label を visible 冒頭 em-dash 形式に
 * migration (iter1610 active-timer calibrated と同 pattern、iter1553-1610 visible 冒頭 em-dash sweep
 * convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"校正後 ${X} — ${delta}"` は visible "→ ${X}" の text 部 を中位置に持ち voice
 * control prefix-matching「click 30分」 が strict prefix-match で不可。iter1610 active-timer
 * calibrated と同 pattern、visible (icon 抜き) 冒頭固定 + em-dash 区切。
 *
 * 修正 (quick-add.tsx):
 *   `校正後 ${X} — ${delta}` → `${X} — 校正後 ${delta}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quick-add-calibrated-em-dash-iter1611.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')

  if (!src.includes('aria-label={`${formatEstimate(calibrated.calibratedMinutes)} — 校正後 ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add calibrated chip aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`校正後 ${formatEstimate(calibrated.calibratedMinutes)} — ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add calibrated chip 旧 aria-label (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — quick-add calibrated chip aria-label が em-dash 形式 (visible 冒頭固定)')
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
