/**
 * Phase 6.15 loop iter1673 (mode-M mobile audit): schedule-item-picker interrupt-note
 * IMEInput (id=schedule-picker-interrupt-note) が `h-11` 不在で WCAG 2.5.5 違反、
 * iter1651 で同 file の autoFocus IMEInput を h-11 化した時の取りこぼし回収。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-picker-interrupt-h11-iter1673.ts
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
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )

  // Locate `id="schedule-picker-interrupt-note"` and verify className="h-11" appears
  const idx = src.indexOf('id="schedule-picker-interrupt-note"')
  if (idx === -1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-picker-interrupt-note IMEInput が見つからない',
    })
  } else {
    const slice = src.slice(Math.max(0, idx - 200), idx + 100)
    if (!slice.includes('className="h-11"')) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message:
          'schedule-picker-interrupt-note IMEInput に className="h-11" が無い (WCAG 2.5.5 violation)',
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — interrupt-note IMEInput が h-11')
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
