/**
 * Phase 6.15 loop iter2413: top-items-by-time-chip <ol> に title 付与し aria-label と sync
 * (src-imports-list iter2405 / recovery-plan ol iter2315 と同 list family title pattern、
 * time-entry 集計 list の hover disclose 補完)。
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
  if (!tic.includes('iter2413')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'top-items-by-time-chip iter2413 marker が無い',
    })
  }
  const text = (
    tic.match(
      /`直近 \$\{WINDOW_DAYS\} 日 Item 別稼働 top \$\{summary\.top\.length\} 件 — 合計時間が多い順`/g,
    ) || []
  ).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `top-items ol 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — top-items-by-time-chip <ol> title sync 完了、time-entry 集計 list の hover disclose 補完',
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
