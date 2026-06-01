/**
 * Phase 6.15 loop iter1677: schedule-item-picker dialog 内 search input に
 * `autoComplete="off"` を追加。dialog 内 search box は browser autocomplete
 * suggestion が dropdown を被せて in-dialog filtering を阻害するため "off"。
 * quick-add iter350 と同 convention。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-picker-autocomplete-iter1677.ts
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

  // Locate the autoFocus IMEInput (search box) and verify autoComplete="off" appears
  const idx = src.indexOf('autoFocus')
  if (idx === -1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'autoFocus IMEInput が見つからない',
    })
  } else {
    const slice = src.slice(idx, idx + 1000)
    if (!slice.includes('autoComplete="off"')) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: 'schedule-item-picker search input に autoComplete="off" が無い',
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — schedule-item-picker search input に autoComplete="off" 着地')
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
