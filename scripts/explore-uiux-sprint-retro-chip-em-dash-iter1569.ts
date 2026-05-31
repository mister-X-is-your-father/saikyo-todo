/**
 * Phase 6.15 loop iter1569: sprint-retro-widget retro-status-chip aria-label を
 * visible 冒頭 em-dash 形式に migration (iter1093-1568 sweep convention 着地)。
 *
 * 旧 aria-label `"${toneLabel}: ${label} ${count} 件"` は ':' colon 区切で visible
 * "${label} ${count}" を末尾に持ち voice control prefix-matching「click ${label}」 が strict
 * prefix-match で不可。iter1093-1568 sweep convention で visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (sprint-retro-widget.tsx):
 *   "${toneLabel}: ${label} ${count} 件" → "${label} ${count} 件 — ${toneLabel}"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-retro-chip-em-dash-iter1569.ts
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
    resolve(here, '../src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${label} ${count} 件 — ${toneLabel}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro chip aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`${toneLabel}: ${label} ${count} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro chip 旧 colon 形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-retro chip aria-label が em-dash 形式')
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
