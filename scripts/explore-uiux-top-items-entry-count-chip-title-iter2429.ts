/**
 * Phase 6.15 loop iter2429: top-items-by-time-chip 各 row entryCount chip に title 付与し
 * aria-label と sync (隣接 chip iter1919 と pair で row 2 chip 全 hover disclose 統一)。
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

  const tic = readFileSync(
    resolve(here, '../src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (!tic.includes('iter2429')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'top-items-by-time-chip iter2429 marker が無い',
    })
  }
  const text = (tic.match(/`\$\{row\.entryCount\} 件`/g) || []).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `entryCount chip 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2413 ol regression 検査
  if (!tic.includes('iter2413')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2413 top-items ol title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — top-items entryCount chip title sync 完了、row 2 chip (合計 + 件数) 全 hover disclose 統一',
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
