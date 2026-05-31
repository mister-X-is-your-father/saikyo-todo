/**
 * Phase 6.15 loop iter1614: top-items-by-time-chip row 合計 chip aria-label を visible 冒頭
 * em-dash 形式に migration (iter1604/1605/1610-1612 visible 冒頭 em-dash sweep convention 着地、
 * WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"合計 ${label}"` は visible "${label}" を末尾に持ち voice control prefix-matching
 *「click 30分」 が strict prefix-match で不可 (substring 一致のみ)。visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (top-items-by-time-chip.tsx):
 *   `合計 ${label}` → `${label} — 合計`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-top-items-row-total-em-dash-iter1614.ts
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
    resolve(here, '../src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${label} — 合計`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'top-items-by-time row 合計 chip aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`合計 ${label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'top-items-by-time row 合計 chip 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — top-items-by-time row 合計 chip aria-label が em-dash 形式 (visible 冒頭固定)',
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
